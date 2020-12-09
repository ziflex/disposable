/* eslint-disable max-classes-per-file */
const isDisposedSym = Symbol('isDisposed');
const resourcesSym = Symbol('disposable resources');
const isDisposedProp = 'isDisposed';
const disposeProp = 'dispose';

/**
 * Represents an ad-hock resource free function.
 */
export type AliasCallFunction = (resource: any) => void;

/**
 * Represents an ad-hock resource check function.
 * If resource is not disposed yet, must return "false". Otherwise, true.
 */
export type AliasCheckFunction = (resource: any) => boolean;

/**
 * Represents an alias for disposable object property.
 */
export type Alias = {
    key: string | symbol;
    call: string | symbol | AliasCallFunction;
    check?: string | symbol | AliasCheckFunction;
};

/**
 * Represents an object property.
 */
export type Property = string | symbol | Alias;

/**
 * Represents a class.
 */
export interface Class {
    new (...args: any[]): any;
}

/**
 * Represents an disposable error.
 */
export class DisposedError extends Error {
    constructor(name: string) {
        super(`"${name} is disposed`);
    }
}

/**
 * Represents a disposable object.
 */
export interface DisposableObject {
    dispose(): void;
    isDisposed(): boolean;
}

/**
 * Represents a disposable class.
 */
export abstract class Disposable implements DisposableObject {
    /**
     * Indicates if a given object implements [[DisposableObject]] interface.
     * @param object - Target object.
     */
    public static isDisposable(object?: Record<string, any>): boolean {
        if (object == null) {
            return false;
        }

        return (
            typeof object.dispose === 'function' &&
            typeof object.isDisposed === 'function'
        );
    }

    /**
     * Tries to dispose a given object if it implements [[DisposableObject]] interface.
     * If the object does not implement the interface,
     * but [deref] param is passed, the method will try to dereference all object's keys.
     * @param object - Target object to dispose.
     * @param deref - A value indicating whether to perform dereferncing.
     */
    public static dispose(
        object: DisposableObject | Record<string, any>,
        deref = false,
    ): void {
        const disposable = object as DisposableObject;

        if (Disposable.isDisposable(disposable)) {
            if (!disposable.isDisposed()) {
                disposable.dispose();
            }

            return;
        }

        if (deref === true) {
            Disposable.dereference(object, Object.keys(object));
        }
    }

    /**
     * Dereferences object's keys.
     * If a value of a key implements [[DisposableObject]] interface, [dispose] method of the value will be invoked.
     * @param object - Target object.
     * @param keys - Keys to dereference. Optional. By default all keys will be dereferenced.
     */
    public static dereference(
        object: Record<string, any>,
        keys?: Property[],
    ): void {
        const target = object;
        const targetKeys: Property[] = keys || Object.keys(object);

        targetKeys.forEach((key: Property) => {
            if (typeof key === 'string' || typeof key === 'symbol') {
                const resource = target[key as any];

                if (Disposable.isDisposable(resource)) {
                    if (!resource.isDisposed()) {
                        resource.dispose();
                    }
                }

                target[key as any] = undefined;
            } else {
                const alias = key as Alias;
                const resource = target[alias.key as any];

                // Resource is not available anymore
                // Nothing to do here
                if (resource == null) {
                    return;
                }

                // By default, we will try to call the method
                let doDispose = true;

                // If check key is provided
                // And it's either a string or symbol
                if (
                    typeof alias.check === 'string' ||
                    typeof alias.check === 'symbol'
                ) {
                    const isDisposed: () => boolean | boolean =
                        resource[alias.check];

                    // And if it's actually a function
                    if (typeof isDisposed === 'function') {
                        // Do the check
                        // The function must return a boolean value
                        doDispose = isDisposed.call(resource) === false;
                    } else if (typeof isDisposed === 'boolean') {
                        doDispose = isDisposed === false;
                    }
                } else if (typeof alias.check === 'function') {
                    doDispose = alias.check(resource) === false;
                }

                // We are good to go
                if (doDispose) {
                    if (
                        typeof alias.call === 'string' ||
                        typeof alias.call === 'symbol'
                    ) {
                        const dispose: () => void = resource[alias.call];

                        // Is it a function?
                        if (typeof dispose === 'function') {
                            dispose.call(resource);
                        }
                    } else if (typeof alias.call === 'function') {
                        alias.call(resource);
                    }
                }

                // Bye bye
                target[alias.key as any] = undefined;
            }
        });
    }

    /**
     * Indicates whether the instance is already disposed.
     */
    public isDisposed(): boolean {
        return (this as any)[isDisposedSym] === true;
    }

    /**
     * Marks the instance as disposed.
     * For actual resource clean up, derived classes should override the method.
     */
    public dispose(): void {
        if (!(this as any)[isDisposedSym]) {
            (this as any)[isDisposedSym] = true;

            // resources set by decorators
            const resources = (this as any)[resourcesSym] as Array<Property>;

            if (resources != null) {
                Disposable.dereference(this, resources);
            }
        }
    }
}

/**
 * Class decorator.
 * Makes a given class disposable.
 * @param target
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const disposable: ClassDecorator = <T extends Function>(target: T) => {
    // If alread is disposable
    if (Disposable.isDisposable(target)) {
        return target as any;
    }

    const isDisposedDescr = Object.getOwnPropertyDescriptor(
        target.prototype,
        isDisposedProp,
    );

    if (isDisposedDescr == null) {
        const desc = Object.getOwnPropertyDescriptor(
            Disposable.prototype,
            isDisposedProp,
        );

        if (desc) {
            Object.defineProperty(target.prototype, isDisposedProp, desc);
        }
    }

    const disposeDescr = Object.getOwnPropertyDescriptor(
        target.prototype,
        disposeProp,
    );

    if (disposeDescr == null) {
        const desc = Object.getOwnPropertyDescriptor(
            Disposable.prototype,
            disposeProp,
        );

        if (desc) {
            Object.defineProperty(target.prototype, disposeProp, desc);
        }
    } else {
        const original = disposeDescr.value;

        Object.defineProperty(target.prototype, disposeProp, {
            configurable: true,
            value: function dispose(): void {
                if (!Disposable.prototype.isDisposed.call(this)) {
                    Disposable.prototype.dispose.call(this);
                    original.call(this);
                }
            },
        });
    }

    return target as T & DisposableObject;
};

export type FreeDecoratorCheckFunction = (resource: any) => boolean;
export interface FreeDecoratorConfig {
    call?: string | symbol | AliasCallFunction;
    check?: string | symbol | AliasCheckFunction;
}

/**
 * Property decorator.
 * Marks a property as a resource that needs to be dispose.
 */
export const free: (config?: FreeDecoratorConfig) => PropertyDecorator = (
    config?: FreeDecoratorConfig,
) => {
    return (target: Record<string, any>, propertyKey: string | symbol) => {
        let resources: Property[] = target[resourcesSym as any];

        if (resources == null) {
            resources = [];
            // eslint-disable-next-line no-param-reassign
            target[resourcesSym as any] = resources;
        }

        if (config == null) {
            resources.push(propertyKey);
        } else {
            resources.push({
                key: propertyKey,
                call: config.call || 'dispose',
                check: config.check || 'isDisposed',
            } as Alias);
        }
    };
};

export interface ProtectDecoratorConfig {
    err?: boolean;
    async?: boolean;
}

/**
 * Method decorator.
 * Does not let to invoke a given method when an instance is disposed.
 * @param config
 * @param config.async - Indicates whether a method is async and Promise needs to be returned.
 * If the instance is disposed, rejected promise is returned.
 * @param config.err - Indicates whether an error must be thrown. If ``async`` is true, the value gets ignored.
 */
export const protect: (config?: ProtectDecoratorConfig) => MethodDecorator = (
    config?: ProtectDecoratorConfig,
) => {
    return (
        __: Record<string, any>,
        _: string | symbol,
        descriptor: TypedPropertyDescriptor<any>,
    ) => {
        const original = descriptor.value;

        // eslint-disable-next-line no-param-reassign
        descriptor.value = function ProtectedFunction(
            this: DisposableObject,
        ): any {
            if (this.isDisposed == null || !this.isDisposed()) {
                // eslint-disable-next-line prefer-rest-params
                return original.apply(this, arguments);
            }

            // If the method is async
            // We always reject it with an error
            if (config != null && config.async === true) {
                return Promise.reject(new DisposedError(this.constructor.name));
            }

            // If the method is NOT async
            // Throwining an error is optional
            if (config != null && config.err === true) {
                throw new DisposedError(this.constructor.name);
            }
        };
    };
};

/**
 * TS helper for disposable classes created via [[disposable]] decorator.
 * @param value
 */
export function asDisposable<T>(value: T): T & DisposableObject {
    return value as any;
}
