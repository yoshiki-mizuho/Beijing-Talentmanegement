import { createServer as createHttpServer, type IncomingMessage } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import {
  createDefaultTenants,
  type FakeNode,
  type FakeTenant,
  type FakeUser
} from "./fixtures";

type Call = grpc.ServerUnaryCall<Record<string, unknown>, unknown>;
type Callback = grpc.sendUnaryData<unknown>;

const protoPath = path.join(process.cwd(), "contract/proto/user/v1/user_service.proto");
const definition = protoLoader.loadSync(protoPath, {
  defaults: true,
  enums: String,
  keepCase: false,
  longs: String,
  oneofs: true
});
const loaded = grpc.loadPackageDefinition(definition) as unknown as {
  user: { v1: { UserService: { service: grpc.ServiceDefinition } } };
};

let tenants = createDefaultTenants();
let delayMs = 0;

function grpcError(code: grpc.status, details: string): grpc.ServiceError {
  return Object.assign(new Error(details), { code, details, metadata: new grpc.Metadata() });
}

function tenantFor(call: Call) {
  const tenantId = call.metadata.get("x-tenant-id")[0];
  return typeof tenantId === "string"
    ? tenants.find((tenant) => tenant.id === tenantId)
    : undefined;
}

function withTenant(
  handler: (call: Call, callback: Callback, tenant: FakeTenant) => void
) {
  return (call: Call, callback: Callback) => {
    const tenant = tenantFor(call);
    const run = () => tenant
      ? handler(call, callback, tenant)
      : callback(grpcError(grpc.status.NOT_FOUND, "tenant not found"));
    if (delayMs > 0) setTimeout(run, delayMs);
    else run();
  };
}

function userInfo(user: FakeUser, tenant: FakeTenant) {
  const node = tenant.nodes.find((candidate) => candidate.id === user.organizationNodeId);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    organizationNodeId: user.organizationNodeId ?? undefined,
    nodeName: node?.name,
    avatarUrl: user.avatarUrl ?? undefined,
    avatarColor: user.avatarColor ?? undefined,
    isNodeLeader: node?.leaderUserIds.includes(user.id) ?? false
  };
}

function descendants(tenant: FakeTenant, rootId: string) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of tenant.nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

function nodeMembers(tenant: FakeTenant, nodeId: string, recursive: boolean) {
  const nodeIds = recursive ? descendants(tenant, nodeId) : new Set([nodeId]);
  return tenant.users
    .filter((user) => user.status === "ACTIVE" && user.organizationNodeId && nodeIds.has(user.organizationNodeId))
    .map((user) => ({
      userId: user.id,
      displayName: user.name,
      avatarColor: user.avatarColor ?? "",
      avatarUrl: user.avatarUrl ?? undefined
    }));
}

const unsupported = (_call: Call, callback: Callback) =>
  callback(grpcError(grpc.status.PERMISSION_DENIED, "method is not available to hubs"));

const supportedMethods = new Set([
  "GetUser",
  "GetUsers",
  "GetOrgNode",
  "GetOrgSubtree",
  "GetLeaderScopeNodeIDs",
  "GetNodeMembers",
  "GetNodeMembersBatch",
  "GetSuperiorIDs",
  "GetDirectLeaderIDs"
]);
const implementations: grpc.UntypedServiceImplementation = Object.fromEntries(
  Object.keys(loaded.user.v1.UserService.service)
    .filter((name) => !supportedMethods.has(name))
    .map((name) => [name, unsupported])
);

Object.assign(implementations, {
  getUser: withTenant((call, callback, tenant) => {
    const user = tenant.users.find((candidate) => candidate.id === call.request.userId);
    callback(user ? null : grpcError(grpc.status.NOT_FOUND, "user not found"), user ? { user: userInfo(user, tenant) } : undefined);
  }),
  getUsers: withTenant((call, callback, tenant) => {
    const ids = call.request.userIds as string[];
    if (ids.length > 200) return callback(grpcError(grpc.status.INVALID_ARGUMENT, "at most 200 user IDs"));
    const users = tenant.users.filter((user) => ids.includes(user.id)).reverse().map((user) => userInfo(user, tenant));
    callback(null, { users });
  }),
  getOrgNode: withTenant((call, callback, tenant) => {
    const node = tenant.nodes.find((candidate) => candidate.id === call.request.nodeId);
    callback(node ? null : grpcError(grpc.status.NOT_FOUND, "node not found"), node ? { node: { id: node.id, name: node.name, levelName: node.levelName, levelNumber: node.levelNumber, parentId: node.parentId ?? "" } } : undefined);
  }),
  getOrgSubtree: withTenant((call, callback, tenant) => {
    const rootId = call.request.rootNodeId as string;
    if (!tenant.nodes.some((node) => node.id === rootId)) return callback(grpcError(grpc.status.NOT_FOUND, "node not found"));
    const ids = descendants(tenant, rootId);
    const nodes = tenant.nodes.filter((node) => ids.has(node.id)).sort((a, b) => a.levelNumber - b.levelNumber || a.name.localeCompare(b.name, "ja")).map((node) => ({
      id: node.id,
      name: node.name,
      parentId: node.parentId ?? "",
      levelNumber: node.levelNumber,
      levelName: node.levelName,
      members: nodeMembers(tenant, node.id, false),
      leaderUserIds: node.leaderUserIds
    }));
    callback(null, { nodes });
  }),
  getLeaderScopeNodeIDs: withTenant((call, callback, tenant) => {
    const roots = tenant.nodes.filter((node) => node.leaderUserIds.includes(call.request.userId as string));
    const nodeIds = [...new Set(roots.flatMap((node) => [...descendants(tenant, node.id)]))];
    callback(null, { nodeIds });
  }),
  getNodeMembers: withTenant((call, callback, tenant) => {
    const nodeId = call.request.nodeId as string;
    if (!tenant.nodes.some((node) => node.id === nodeId)) return callback(grpcError(grpc.status.NOT_FOUND, "node not found"));
    const members = nodeMembers(tenant, nodeId, Boolean(call.request.recursive));
    callback(members.length > 5000 ? grpcError(grpc.status.INVALID_ARGUMENT, "at most 5000 members") : null, { members });
  }),
  getNodeMembersBatch: withTenant((call, callback, tenant) => {
    const nodeIds = call.request.nodeIds as string[];
    if (nodeIds.length > 100) return callback(grpcError(grpc.status.INVALID_ARGUMENT, "at most 100 node IDs"));
    callback(null, { entries: nodeIds.map((nodeId) => ({ nodeId, members: nodeMembers(tenant, nodeId, Boolean(call.request.recursive)) })) });
  }),
  getSuperiorIDs: withTenant((call, callback, tenant) => {
    const user = tenant.users.find((candidate) => candidate.id === call.request.userId);
    if (!user) return callback(grpcError(grpc.status.NOT_FOUND, "user not found"));
    const superiorIds: string[] = [];
    let nodeId = user.organizationNodeId;
    while (nodeId) {
      const node = tenant.nodes.find((candidate) => candidate.id === nodeId);
      if (!node) break;
      superiorIds.push(...node.leaderUserIds.filter((id) => id !== user.id));
      nodeId = node.parentId;
    }
    callback(null, { superiorIds: [...new Set(superiorIds)] });
  }),
  getDirectLeaderIDs: withTenant((call, callback, tenant) => {
    const user = tenant.users.find((candidate) => candidate.id === call.request.userId);
    if (!user) return callback(grpcError(grpc.status.NOT_FOUND, "user not found"));
    const node = tenant.nodes.find((candidate) => candidate.id === user.organizationNodeId);
    callback(null, {
      userIds: node?.leaderUserIds.filter((id) => id !== user.id) ?? []
    });
  })
});

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown> : {};
}

export async function startFakePlatform(grpcPort = 0, httpPort = 0) {
  const grpcServer = new grpc.Server();
  grpcServer.addService(loaded.user.v1.UserService.service, implementations);
  const boundGrpcPort = await new Promise<number>((resolve, reject) => {
    grpcServer.bindAsync(`127.0.0.1:${grpcPort}`, grpc.ServerCredentials.createInsecure(), (error, port) => error ? reject(error) : resolve(port));
  });

  const httpServer = createHttpServer(async (request, response) => {
    response.setHeader("content-type", "application/json; charset=utf-8");
    if (request.method === "GET" && request.url === "/__fake/health") {
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (request.method !== "POST") {
      response.statusCode = 404;
      response.end(JSON.stringify({ error: "not found" }));
      return;
    }

    const body = await readJson(request);
    if (request.url === "/__fake/reset") {
      tenants = createDefaultTenants();
      delayMs = 0;
    } else if (request.url === "/__fake/users") {
      const tenant = tenants.find((candidate) => candidate.id === body.tenantId);
      if (!tenant) response.statusCode = 404;
      else tenant.users.push(body.user as FakeUser);
    } else if (request.url === "/__fake/nodes") {
      const tenant = tenants.find((candidate) => candidate.id === body.tenantId);
      if (!tenant) response.statusCode = 404;
      else tenant.nodes.push(body.node as FakeNode);
    } else if (request.url === "/__fake/users/delete") {
      const tenant = tenants.find((candidate) => candidate.id === body.tenantId);
      if (!tenant) response.statusCode = 404;
      else tenant.users = tenant.users.filter((user) => user.id !== body.userId);
    } else if (request.url === "/__fake/nodes/delete") {
      const tenant = tenants.find((candidate) => candidate.id === body.tenantId);
      if (!tenant) response.statusCode = 404;
      else tenant.nodes = tenant.nodes.filter((node) => node.id !== body.nodeId);
    } else if (request.url === "/__fake/delay") {
      delayMs = Math.max(0, Number(body.delayMs) || 0);
    } else {
      response.statusCode = 404;
    }
    response.end(JSON.stringify({ ok: response.statusCode < 400 }));
  });
  await new Promise<void>((resolve) => httpServer.listen(httpPort, "127.0.0.1", resolve));
  const address = httpServer.address();
  const boundHttpPort = typeof address === "object" && address ? address.port : httpPort;

  return {
    grpcPort: boundGrpcPort,
    httpPort: boundHttpPort,
    async stop() {
      await Promise.all([
        new Promise<void>((resolve) => grpcServer.tryShutdown(() => resolve())),
        new Promise<void>((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()))
      ]);
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const grpcPort = Number(process.env.PLATFORM_FAKE_GRPC_PORT ?? 50051);
  const httpPort = Number(process.env.PLATFORM_FAKE_HTTP_PORT ?? 50052);
  const running = await startFakePlatform(grpcPort, httpPort);
  console.log(`Fake platform listening on gRPC ${running.grpcPort}, HTTP ${running.httpPort}`);
}
