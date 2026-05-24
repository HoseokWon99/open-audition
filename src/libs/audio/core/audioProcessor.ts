import { Result } from "neverthrow";
import { OpenAuditionError } from "../../../types/error.ts";

export abstract class AudioProcessor<Params> {
    private _nodes: AudioNode[];

    protected constructor(
       readonly type: string,
       readonly params: Params,
    ) {}
}

