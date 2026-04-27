/**
 * Simple implementation of the deferred pattern.
 * An object that exposes a promise and functions to resolve and reject it.
 */
export class Deferred<T = void> {
    state: 'resolved' | 'rejected' | 'unresolved' = 'unresolved';
    resolve!: (value: T | PromiseLike<T>) => void;
    reject!: (err?: unknown) => void;

    promise = new Promise<T>((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    }).then(
        res => (this.setState('resolved'), res),
        err => (this.setState('rejected'), Promise.reject(err)),
    );

    protected setState(state: 'resolved' | 'rejected'): void {
        if (this.state === 'unresolved') {
            this.state = state;
        }
    }
}


/**
 * @returns resolves after a specified number of milliseconds
 */
export function timeout(ms: number): Promise<void> {
    const deferred = new Deferred<void>();
    setTimeout(() => deferred.resolve(), ms);
   
    return deferred.promise;
}


/**
 * Creates a promise that is rejected after the given amount of time. A typical use case is to wait for another promise until a specified timeout using:
 * ```
 * Promise.race([ promiseToPerform, timeoutReject(timeout, 'Timeout error message') ]);
 * ```
 *
 * @param ms timeout in milliseconds
 * @param message error message on promise rejection
 * @returns rejection promise
 */
export function timeoutReject<T>(ms: number, message?: string): Promise<T> {
    const deferred = new Deferred<T>();
    setTimeout(() => deferred.reject(new Error(message)), ms);
    return deferred.promise;
}


export async function retry<T>(task: () => Promise<T>, retryDelay: number, retries: number): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
        try {
            return await task();
        } catch (error) {
            lastError = error as Error;

            await timeout(retryDelay);
        }
    }

    throw lastError;
}


/**
 * A function to allow a promise resolution to be delayed by a number of milliseconds. Usage is as follows:
 *
 * `const stringValue = await myPromise.then(delay(600)).then(value => value.toString());`
 *
 * @param ms the number of millisecond to delay
 * @returns a function that returns a promise that returns the given value, but delayed
 */
export function delay<T>(ms: number): (value: T) => Promise<T> {
    return value => new Promise((resolve, reject) => { setTimeout(() => resolve(value), ms); });
}

/**
 * Constructs a promise that will resolve after a given delay.
 * @param ms the number of milliseconds to wait
 */
export async function wait(ms: number): Promise<void> {
    await delay(ms)(undefined);
}