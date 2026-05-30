import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioNodeManager } from "./audioNodeManager";

export interface AudioEffect {
  id: string;
  input: AudioNode;
  output: AudioNode;
  activate(manager: AudioNodeManager): Result<void, OpenAuditionError>;
}
