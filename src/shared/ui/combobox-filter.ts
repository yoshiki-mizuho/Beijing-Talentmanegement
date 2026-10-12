export type ComboboxOption = {
  value: string;
  label: string;
  group?: string;
};

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja");
}

export function filterComboboxOptions(options: ComboboxOption[], query: string) {
  const normalizedQuery = normalize(query.trim());
  if (!normalizedQuery) return options;

  return options.filter((option) =>
    [option.label, option.group].some(
      (value) => value && normalize(value).includes(normalizedQuery)
    )
  );
}
