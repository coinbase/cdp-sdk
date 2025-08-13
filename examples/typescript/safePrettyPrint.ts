export function safePrettyPrint(obj: any) {
  console.log(
    JSON.stringify(
      obj,
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    )
  );
}
