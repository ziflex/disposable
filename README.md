# disposable

> Disposable abstract class

[![npm version](https://badge.fury.io/js/disposable-class.svg)](https://www.npmjs.com/package/disposable-class)
[![Actions Status](https://github.com/ziflex/disposable/workflows/Node%20CI/badge.svg)](https://github.com/ziflex/disposable/workflows/Node%20CI/badge.svg)

## Installation

```bash
npm i disposable-class
```

## Usage

[API](https://ziflex.github.io/disposable/)

### As a class

```typescript
import { Disposable } from 'disposable-class';

interface DbConnection {
    close(): void;
}

class Repository extends Disposable {
    private _conn: DbConnection;

    constructor(conn: DbConnection) {
        super();

        this._conn = conn;
    }

    public dispose(): void {
        if (!this.isDisposed()) {
            // important to call in order to mark the class as disposed
            super.dispose();

            this._conn.close();
        }
    }
}
```

### As a decorator

```typescript
import { disposable } from 'disposable-class';

interface DbConnection {
    close(): void;
}

@disposable
class Repository {
    private _conn: DbConnection;

    constructor(conn: DbConnection) {
        this._conn = conn;
    }

    public dispose(): void {
        // with decorator you do not have to call super.dispose();
        // the decorator does it automatically

        this._conn.close();
    }
}
```

### Freeing resources

#### Plain values

```typescript
import { disposable, free } from 'disposable-class';

@disposable
class Repository {
    @free()
    private _data: []; // the property will be dereferenced

    constructor() {
        this._conn = [];
    }
}
```

#### Disposables

```typescript
import { disposable, free } from 'disposable-class';

@disposable
class ResourceA {
    @free()
    private _data: []; // the property will be dereferenced

    constructor() {
        this._conn = [];
    }
}

@disposable
class ResourceB {
    @free()
    private _data: ResourceA; // 'dispose' will be invoked and the property will be dereferenced

    constructor() {
        this._conn = new ResourceA();
    }
}
```

#### Custom objects

```typescript
import { disposable, free } from 'disposable-class';

interface DbConnection {
    close(): void;
}

@disposable
class Repository {
    // "free" decorator allows you to create an alias for a property
    // by adding information what method must be called to free underlying resource.
    // Optionally, 'check' param can be passed in order to do a check whether the resource needs to be freed.
    // For example, "@free({ call: 'close', check: 'isClosed' })".
    @free({ call: 'close' })
    private _conn: { close: Function };

    constructor(conn: DbConnection) {
        this._conn = conn;
    }
}
```

#### Custom objects 2

```typescript
import { disposable, free } from 'disposable-class';

interface DbConnection {
    close(): void;
    isClosed(): boolean;
}

@disposable
class Repository {
    // You can go wild
    @free({
        call: (conn: DbConnection) => conn.close(),
        check: (conn: DbConnection) => conn.isClosed(),
    })
    private _conn: DbConnection;

    constructor(conn: DbConnection) {
        this._conn = conn;
    }
}
```

### Methods protection

```typescript
import { disposable, free, protect } from 'disposable-class';

@disposable
class List<T> {
    @free()
    private _items: T[];

    constructor() {
        this._items = [];
    }

    // Onсe the instance gets disposed
    // All further function calls will be ignored
    @protect()
    public add(item: T): void {
        // It's very important to protect methods that use properties that marked as freeable
        // In order to avoid runtime error, because the properties will be derefferenced
        this._items.push(item);
    }
}
```

#### Async methods

```typescript
import { disposable, protect } from 'disposable-class';

@disposable
class Repository {
    @free()
    private _conn: DbConnection;

    constructor(conn: DbConnection) {
        this._conn = conn;
    }

    // One the instance gets disposed
    // All further function calls will
    @protect({ async: true })
    public async findOne(query: any): void {
        return this._conn.findOne(query);
    }
}
```
