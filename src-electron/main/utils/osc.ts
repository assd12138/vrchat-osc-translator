import { createSocket } from "node:dgram";

// 定义 OSC 消息参数的类型联合
type OscArg = string | number | boolean;

/**
 * 构建符合 OSC 协议的 Buffer
 * OSC 协议要求地址、类型标签和字符串参数必须按 4 字节对齐
 */
function buildOscMessage(address: string, args: OscArg[]): Buffer {
  const buffers: Buffer[] = [];

  // 1. 构建地址部分
  // 格式：地址字符串 + null终止符 + 填充字节
  const addressStr = `${address}\0`;
  const addressPadding = (4 - ((address.length + 1) % 4)) % 4;
  const addressBuffer = Buffer.concat([
    Buffer.from(addressStr, "utf-8"),
    Buffer.alloc(addressPadding),
  ]);
  buffers.push(addressBuffer);

  // 2. 构建类型标签部分
  // 格式：',' + 类型字符(s, i, f, T, F) + null终止符 + 填充字节
  let typeTagString = ",";
  args.forEach((arg) => {
    if (typeof arg === "string") typeTagString += "s";
    else if (typeof arg === "boolean") typeTagString += arg ? "T" : "F";
    else if (Number.isInteger(arg)) typeTagString += "i";
    else typeTagString += "f";
  });

  const typeTagStr = `${typeTagString}\0`;
  const typeTagPadding = (4 - ((typeTagString.length + 1) % 4)) % 4;
  const typeTagBuffer = Buffer.concat([
    Buffer.from(typeTagStr, "utf8"),
    Buffer.alloc(typeTagPadding),
  ]);
  buffers.push(typeTagBuffer);

  // 3. 构建参数部分
  args.forEach((arg) => {
    if (typeof arg === "boolean") {
      // 布尔类型在 OSC 中只有类型标签(T/F)，没有数据部分
      return;
    }
    if (typeof arg === "string") {
      // 字符串：内容 + null终止符 + 填充字节
      const argStr = `${arg}\0`;
      const argPadding = (4 - ((arg.length + 1) % 4)) % 4;
      const argBuffer = Buffer.concat([
        Buffer.from(argStr, "utf-8"),
        Buffer.alloc(argPadding),
      ]);
      buffers.push(argBuffer);
    } else if (Number.isInteger(arg)) {
      // 整数：4字节大端序
      const argBuffer = Buffer.alloc(4);
      argBuffer.writeInt32BE(arg, 0);
      buffers.push(argBuffer);
    } else {
      // 浮点数：4字节大端序
      const argBuffer = Buffer.alloc(4);
      argBuffer.writeFloatBE(arg, 0);
      buffers.push(argBuffer);
    }
  });

  return Buffer.concat(buffers);
}

/**
 * 异步发送 OSC 消息
 */
function sendOscMessage(
  host: string,
  port: number,
  address: string,
  args: OscArg[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = createSocket("udp4");

    try {
      const messageBuffer = buildOscMessage(address, args);

      client.send(
        messageBuffer,
        0,
        messageBuffer.length,
        port,
        host,
        (err, bytes) => {
          client.close();
          if (err) {
            reject(err);
          } else {
            console.log(`✅ 成功发送 ${bytes} 字节到 ${host}:${port}`);
            resolve();
          }
        },
      );
    } catch (err) {
      client.close();
      reject(err);
    }
  });
}

// --- 主程序入口 ---

const VRCHAT_HOST = "127.0.0.1";
const VRCHAT_PORT = 9000;

export const sendVrchatMessage = async ({ text }: { text: string }) => {
  await sendOscMessage(VRCHAT_HOST, VRCHAT_PORT, "/chatbox/input", [
    text,
    true,
  ]);
};
