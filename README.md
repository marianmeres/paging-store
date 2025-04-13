# @marianmeres/paging-store

Simple utility for calculating paging data.

## Install
```shell
$ npm i @marianmeres/paging-store
```

## Example

```javascript
const paging = calculatePaging({ total: 25, limit: 10, offset: 11 });

// paging is now:
{
    total: 25,
    limit: 10,
    offset: 11,
    isLast: false,
    isFirst: false,
    nextPage: 3,
    previousPage: 1,
    hasNext: true,
    hasPrevious: true,
    nextOffset: 20,
    previousOffset: 0,
    currentPage: 2,
    pageCount: 3,
    firstOffset: 0,
    lastOffset: 20,
}

// store api
const store = createPagingStore({ total: 25, limit: 10, offset: 0 });
store.subscribe((paging) => {/* see shape above */});
store.update(/*any/all of { total: ..., limit: ..., offset: ... }*/);
store.reset(limit?);
```
