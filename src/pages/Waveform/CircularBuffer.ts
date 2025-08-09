// CircularBuffer.ts
// A simple generic circular buffer for fixed-size rolling data

export default class CircularBuffer<T> {
    private buffer: T[];
    private capacity: number;
    private start: number = 0;
    private size: number = 0;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.buffer = new Array<T>(capacity);
    }

    push(item: T) {
        this.buffer[(this.start + this.size) % this.capacity] = item;
        if (this.size < this.capacity) {
            this.size++;
        } else {
            this.start = (this.start + 1) % this.capacity;
        }
    }

    pushMany(items: T[]) {
        for (const item of items) {
            this.push(item);
        }
    }

    toArray(): T[] {
        if (this.size < this.capacity) {
            return this.buffer.slice(0, this.size);
        }
        return this.buffer.slice(this.start).concat(this.buffer.slice(0, this.start));
    }

    clear() {
        this.start = 0;
        this.size = 0;
        this.buffer = new Array<T>(this.capacity);
    }

    get length() {
        return this.size;
    }
}

