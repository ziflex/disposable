# disposable

> Disposable abstract class

## Installation

```bash
npm i disposable-class
```

## Usage

### As class

```typescript
import { Disposable } from 'disposable-class';

class Repository extends Disposable {
    private _conn: any;

    constructor() {
        super();

        this._conn = new DbConnection();
    }

    public dispose(): void {
        // important to call in order to mark the class as disposed
        super.dispose();

        this._conn.close();
    }
}
```

### As a decorator

```typescript
import { disposable } from 'disposable-class';

@disposable
class Repository {
    private _conn: DbConnection;

    constructor() {
        this._conn = new DbConnection();
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
import { disposable } from 'disposable-class';

@disposable
class Repository {
    // "free" decorator allows you to create an alias for a property
    // by adding information what method must be called to free underlying resource.
    // Optionally, 'check' param can be passed in order to do a check whether the resource needs to be freed.
    // For example, "@free({ call: 'close', check: 'isClosed' })".
    @free({ call: 'close' })
    private _conn: { close: Function };

    constructor() {
        this._conn = new DbConnection();
    }
}
```

#### Custom objects 2

```typescript
import { disposable } from 'disposable-class';

@disposable
class Repository {
    // You can go wild
    @free({
        call: (conn: DbConnection) => conn.close(),
        check: (conn: DbConnect) => conn.isClosed(),
    })
    private _conn: DbConnection;

    constructor() {
        this._conn = new DbConnection();
    }
}
```

### Methods protection

```typescript
import { disposable, protect } from 'disposable-class';

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

    constructor() {
        this._conn = new DbConnection('localhost/my_database');
    }

    // One the instance gets disposed
    // All further function calls will
    @protect({ async: true })
    public async findOne(query: any): void {
        return this._conn.findOne(query);
    }
}
```
