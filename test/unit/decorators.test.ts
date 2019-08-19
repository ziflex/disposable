import { expect } from 'chai';
import sinon, { SinonSpy } from 'sinon';
import {
    Disposable,
    asDisposable,
    disposable,
    free,
    protect,
} from '../../src/index';

describe('Decorators', () => {
    describe('@disposable', () => {
        it('should turn a given class into a disposable one', () => {
            @disposable
            class Fixture {}

            const f = asDisposable(new Fixture());

            expect(f.isDisposed).to.exist;
            expect(f.dispose).to.exist;

            expect(f.isDisposed()).to.be.false;

            f.dispose();

            expect(f.isDisposed()).to.be.true;
        });

        context('Override dispose method', () => {
            it('should mark object as disposed', () => {
                @disposable
                class Fixture {
                    private __spy: SinonSpy;

                    constructor(spy: SinonSpy) {
                        this.__spy = spy;
                    }

                    public dispose(): void {
                        this.__spy();
                    }
                }

                const spy = sinon.spy();
                const f = asDisposable(new Fixture(spy));

                expect(f.isDisposed()).to.be.false;
                f.dispose();
                expect(f.isDisposed()).to.be.true;
                f.dispose();
                expect(spy.callCount).to.eq(1);
            });
        });
    });

    describe('@free', () => {
        it('should dereference marked properties', () => {
            class Fixture extends Disposable {
                @free()
                public name: string;

                @free()
                private __age: number;

                constructor(name: string, age: number) {
                    super();

                    this.name = name;
                    this.__age = age;
                }
            }

            const f = new Fixture('Foo bar', 32);

            expect(f.name).to.exist;

            f.dispose();

            expect(f.name).to.not.exist;
            expect(f['__age']).to.not.exist;
        });

        it('should use alias for close', () => {
            class Connection {
                private __spy: SinonSpy;

                constructor(spy: SinonSpy) {
                    this.__spy = spy;
                }

                public close(): void {
                    this.__spy();
                }
            }

            class Fixture extends Disposable {
                @free({ call: 'close' })
                public readonly conn: Connection;

                constructor(conn: Connection) {
                    super();

                    this.conn = conn;
                }
            }

            const spy = sinon.spy();
            const f = asDisposable(new Fixture(new Connection(spy)));

            f.dispose();
            expect(f.conn).to.not.exist;
            expect(spy.calledOnce).to.be.true;

            f.dispose();
            expect(spy.calledOnce).to.be.true;
        });

        it('should use alias for check', () => {
            class Connection {
                private __spy: SinonSpy;

                constructor(spy: SinonSpy) {
                    this.__spy = spy;
                }

                public isClosed(): boolean {
                    return true;
                }

                public close(): void {
                    this.__spy();
                }
            }

            class Fixture extends Disposable {
                @free({ call: 'close', check: 'isClosed' })
                public readonly conn: Connection;

                constructor(conn: Connection) {
                    super();

                    this.conn = conn;
                }
            }

            const spy = sinon.spy();
            const f = asDisposable(new Fixture(new Connection(spy)));

            f.dispose();
            expect(f.conn).to.not.exist;
            expect(spy.called).to.be.false;

            f.dispose();
            expect(spy.called).to.be.false;
        });

        it('should use alias to a computed property for check', () => {
            class Connection {
                private __spy: SinonSpy;

                constructor(spy: SinonSpy) {
                    this.__spy = spy;
                }

                public get isClosed(): boolean {
                    return true;
                }

                public close(): void {
                    this.__spy();
                }
            }

            class Fixture extends Disposable {
                @free({ call: 'close', check: 'isClosed' })
                public readonly conn: Connection;

                constructor(conn: Connection) {
                    super();

                    this.conn = conn;
                }
            }

            const spy = sinon.spy();
            const f = asDisposable(new Fixture(new Connection(spy)));

            f.dispose();
            expect(f.conn).to.not.exist;
            expect(spy.called).to.be.false;

            f.dispose();
            expect(spy.called).to.be.false;
        });

        it('should use function alias for check', () => {
            class Connection {
                private __spy: SinonSpy;

                constructor(spy: SinonSpy) {
                    this.__spy = spy;
                }

                public close(): void {
                    this.__spy();
                }
            }

            class Fixture extends Disposable {
                @free({ call: 'close', check: () => true })
                public readonly conn: Connection;

                constructor(conn: Connection) {
                    super();

                    this.conn = conn;
                }
            }

            const spy = sinon.spy();
            const f = asDisposable(new Fixture(new Connection(spy)));

            f.dispose();
            expect(f.conn).to.not.exist;
            expect(spy.called).to.be.false;

            f.dispose();
            expect(spy.called).to.be.false;
        });

        it('should use function alias for call', () => {
            class Connection {
                private __spy: SinonSpy;

                constructor(spy: SinonSpy) {
                    this.__spy = spy;
                }

                public isClosed(): boolean {
                    return this.__spy.called;
                }

                public close(): void {
                    this.__spy();
                }
            }

            class Fixture extends Disposable {
                @free({ call: (conn: Connection) => conn.close() })
                public readonly conn: Connection;

                constructor(conn: Connection) {
                    super();

                    this.conn = conn;
                }
            }

            const spy = sinon.spy();
            const f = asDisposable(new Fixture(new Connection(spy)));

            f.dispose();
            expect(f.conn).to.not.exist;
            expect(spy.calledOnce).to.be.true;

            f.dispose();
            expect(spy.calledOnce).to.be.true;
        });
    });

    describe('@protect', () => {
        context('When err=false', () => {
            it('should not call a method when disposed', () => {
                class Fixture extends Disposable {
                    private __fn: SinonSpy;

                    constructor(fn: SinonSpy) {
                        super();

                        this.__fn = fn;
                    }

                    @protect()
                    public exec(): void {
                        this.__fn();
                    }
                }

                const spy = sinon.spy();
                const f = new Fixture(spy);

                f.exec();

                f.dispose();

                f.exec();

                expect(spy.callCount).to.eq(1);
            });
        });

        context('When err=true', () => {
            it('should throw when disposed', () => {
                class Fixture extends Disposable {
                    private __fn: SinonSpy;

                    constructor(fn: SinonSpy) {
                        super();

                        this.__fn = fn;
                    }

                    @protect({ err: true })
                    public exec(): void {
                        this.__fn();
                    }
                }

                const spy = sinon.spy();
                const f = new Fixture(spy);

                expect(() => {
                    f.exec();
                }).to.not.throw(Error);

                f.dispose();

                expect(() => {
                    f.exec();
                }).to.throw(Error);

                expect(spy.callCount).to.eq(1);
            });
        });
    });

    it('should use all decorator', () => {
        class Resource extends Disposable {
            private __spy: SinonSpy;

            constructor(spy: SinonSpy) {
                super();

                this.__spy = spy;
            }

            public call(): void {
                this.__spy();
            }
        }

        @disposable
        class Fixture {
            @free()
            public readonly res: Resource;

            constructor(res: Resource) {
                this.res = res;
            }

            @protect()
            public exec(): void {
                this.res.call();
            }
        }

        const spy = sinon.spy();
        const res = asDisposable(new Resource(spy));
        const f = asDisposable(new Fixture(res));

        f.exec();

        f.dispose();

        expect(() => {
            f.exec();
        }).to.not.throw(Error);

        expect(f.res).to.not.exist;
        expect(res.isDisposed()).to.be.true;
    });
});
