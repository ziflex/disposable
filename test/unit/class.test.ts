import { expect } from 'chai';
import { Disposable } from '../../src/index';

class Fxiture extends Disposable {}

describe('Disposable', () => {
    describe('.isDisposed', () => {
        context('When not disposed', () => {
            it('should return false', () => {
                const f = new Fxiture();

                expect(f.isDisposed()).to.be.false;
            });
        });

        context('When disposed', () => {
            it('should return false', () => {
                const f = new Fxiture();
                f.dispose();

                expect(f.isDisposed()).to.be.true;
            });
        });
    });

    describe('.dispose', () => {
        context('When not disposed', () => {
            it('should mark a class as disposed', () => {
                const f = new Fxiture();

                expect(f.isDisposed()).to.be.false;

                f.dispose();

                expect(f.isDisposed()).to.be.true;
            });
        });

        context('When disposed', () => {
            it('should do nothing', () => {
                const f = new Fxiture();

                expect(f.isDisposed()).to.be.false;

                f.dispose();

                expect(f.isDisposed()).to.be.true;

                f.dispose();

                expect(f.isDisposed()).to.be.true;
            });
        });
    });
});
