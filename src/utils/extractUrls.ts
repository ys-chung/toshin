export function extractUrls(input: string): URL[] {
  const inputArr = input
    .split(" ")
    .map((str) => str.replace(/^</, "").replace(/>$/, ""))
  return inputArr
    .map((e) => {
      try {
        return new URL(e)
      } catch (_error) {
        return false
      }
    })
    .filter((e): e is URL => e !== false)
}
