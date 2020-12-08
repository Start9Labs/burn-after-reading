import { BehaviorSubject, Subject } from 'rxjs'
import * as streams from 'web-streams-polyfill/ponyfill'

export const needsReadableStreamPonyfill = new ReadableStream().pipeTo ? false : true
export const supportsStreaming = !!(new Blob().stream)

export class ObservableSource implements UnderlyingSource<Uint8Array> {
    private readonly reader: ReadableStreamDefaultReader
    constructor (
        private readonly isComplete: Subject<boolean>,
        stream: ReadableStream,
    ) {
        this.reader = stream.getReader()
    }

    async start (_controller: ReadableStreamDefaultController<Uint8Array>): Promise<void> {
        return
    }

    async pull (controller: ReadableStreamDefaultController<Uint8Array>): Promise<void> {
        const res = await this.reader.read()
        if (res.value) controller.enqueue(res.value)
        if (res.done) {
            controller.close()
            this.isComplete.next(true)
        }
    }

    async cancel (reason: any) {
        this.reader.cancel(reason)
    }
}

export function instrumentStream (isComplete: Subject<boolean>, readableStream: ReadableStream): ReadableStream {
    const source = new ObservableSource(isComplete, readableStream)
    return needsReadableStreamPonyfill ? new streams.ReadableStream(source) : new ReadableStream(source)
}

export class ObservableBlobImpl implements ObservableBlob {
    readonly size: number
    readonly bulkDownload: boolean
    readonly type: string
    isComplete: BehaviorSubject<boolean>

    constructor (
        private readonly blob: Blob,
        bulkDownload?: boolean,
    ) {
        this.size = blob.size
        this.type = blob.type
        this.bulkDownload = bulkDownload || false
        this.isComplete = new BehaviorSubject(false) as BehaviorSubject<boolean>
    }

    async arrayBuffer (): Promise<ArrayBuffer> {
        const res = await new Response(this.blob).arrayBuffer()
        this.isComplete.next(true)
        return res
    }

    stream (): ReadableStream {
        return instrumentStream(this.isComplete, this.blob.stream())
    }

    slice (start?: number | undefined, end?: number | undefined, contentType?: string | undefined): ObservableBlob {
        return new ObservableBlobImpl(this.blob.slice(start, end, contentType))
    }

    async text (): Promise<string> {
        const res = await new Response(this.blob).text()
        this.isComplete.next(true)
        return res
    }
}

export interface ObservableBlob extends Blob {
    readonly bulkDownload: boolean
    isComplete: Subject<boolean>
    slice: (start?: number | undefined, end?: number | undefined, contentType?: string | undefined) => ObservableBlob
}