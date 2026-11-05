import { Buffer } from "buffer";
import process from "process";

(window as any).Buffer = Buffer;
(window as any).process = process;
(globalThis as any).process = process;
