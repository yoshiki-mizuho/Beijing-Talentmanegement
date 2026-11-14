import { createHash } from "node:crypto";
import { z } from "zod";

export type ProposalSheetPromptInput = {
  itExperienceYears: string | null;
  note: string;
  customerRequest: string;
  skills: Array<{ id: string; name: string; category: string; level: number }>;
  projects: Array<{
    id: string;
    title: string;
    period: string;
    industry: string;
    summary: string;
    role: string;
    teamSize: string;
    businessArea: string | null;
    phases: string[];
    technologies: string[];
  }>;
  certifications: Array<{ name: string; acquiredMonth: string | null }>;
};

export type ProposalSheetText = {
  selfPr: string;
  strengths: string;
  projects: Array<{ id: string; description: string }>;
};

const responseSchema = z.object({
  selfPr: z.string(),
  strengths: z.string(),
  projects: z.array(z.object({ id: z.string(), description: z.string() }))
});

export function buildProposalSheetMessages(input: ProposalSheetPromptInput) {
  return [
    {
      role: "system" as const,
      content: [
        "あなたは顧客に提案するスキルシートの文章を書く担当者です。",
        "事実を変えたり足したりせず、誇張せず、個人名と顧客名を書かないでください。",
        "顧客の要望があれば近い経験とスキルを前に出してください。",
        "JSONだけを返してください。",
        "形式は {\"selfPr\":string,\"strengths\":string,\"projects\":[{\"id\":string,\"description\":string}]} です。",
        "自己PRは300字前後、得意分野は3つ程度を「／」で区切り、案件説明は120字前後にしてください。"
      ].join("")
    },
    { role: "user" as const, content: JSON.stringify(input) }
  ];
}

export function parseProposalSheetResponse(
  value: string,
  input: ProposalSheetPromptInput
): ProposalSheetText {
  let json: unknown;
  try {
    json = JSON.parse(unwrapJsonCodeBlock(value));
  } catch {
    throw new Error("invalid_response");
  }
  const parsed = responseSchema.parse(json);
  const known = new Map(input.projects.map((project) => [project.id, project]));
  const descriptions = new Map(
    parsed.projects
      .filter((project) => known.has(project.id))
      .map((project) => [project.id, project.description.slice(0, 500)])
  );
  return {
    selfPr: parsed.selfPr.slice(0, 800),
    strengths: parsed.strengths.slice(0, 200),
    projects: input.projects.map((project) => ({
      id: project.id,
      description: descriptions.get(project.id) ?? project.summary.slice(0, 500)
    }))
  };
}

// モデルによっては JSON を ```json のコードブロックで囲んで返すため、外してから読む
function unwrapJsonCodeBlock(value: string) {
  const match = value.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1] : value;
}

export function createFallbackProposalSheet(input: ProposalSheetPromptInput): ProposalSheetText {
  return {
    selfPr: input.note.slice(0, 800),
    strengths: [...input.skills]
      .sort((left, right) => right.level - left.level || left.name.localeCompare(right.name, "ja"))
      .slice(0, 3)
      .map((skill) => skill.name)
      .join("／")
      .slice(0, 200),
    projects: input.projects.map((project) => ({
      id: project.id,
      description: project.summary.slice(0, 500)
    }))
  };
}

export function createFakeProposalSheetResponse(input: ProposalSheetPromptInput) {
  return JSON.stringify({
    selfPr: `【テスト用の下書き】${input.note || "登録された経験とスキルを活かして取り組みます。"}`,
    strengths: createFallbackProposalSheet(input).strengths,
    projects: input.projects.map((project) => ({
      id: project.id,
      description: `【テスト用】${project.summary}`
    }))
  });
}

export function hashProposalSheetInput(input: ProposalSheetPromptInput) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
