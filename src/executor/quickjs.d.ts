declare module '*.wasm' {
  const content: ArrayBuffer;
  export default content;
}

declare module '*.wasm.map.txt' {
  const content: string;
  export default content;
}

