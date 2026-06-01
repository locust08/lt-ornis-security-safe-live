const shiftAmounts = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const constants = Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0,
);

const leftRotate = (value: number, amount: number) =>
  ((value << amount) | (value >>> (32 - amount))) >>> 0;

const wordToHex = (word: number) => {
  let output = "";

  for (let index = 0; index < 4; index += 1) {
    output += ((word >>> (index * 8)) & 0xff).toString(16).padStart(2, "0");
  }

  return output;
};

export const md5 = (input: string) => {
  const source = new TextEncoder().encode(input);
  const bitLength = source.length * 8;
  const paddedLength = (((source.length + 8) >>> 6) + 1) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.length] = 0x80;

  for (let index = 0; index < 8; index += 1) {
    bytes[paddedLength - 8 + index] = Math.floor(bitLength / 2 ** (8 * index)) & 0xff;
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array<number>(16);

    for (let index = 0; index < 16; index += 1) {
      const pointer = offset + index * 4;
      words[index] =
        bytes[pointer] |
        (bytes[pointer + 1] << 8) |
        (bytes[pointer + 2] << 16) |
        (bytes[pointer + 3] << 24);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;

      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      b = (b + leftRotate((a + f + constants[index] + words[g]) >>> 0, shiftAmounts[index])) >>> 0;
      a = temp;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  return wordToHex(a0) + wordToHex(b0) + wordToHex(c0) + wordToHex(d0);
};
