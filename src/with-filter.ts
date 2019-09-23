import { $$asyncIterator } from 'iterall';

export type FilterFn = (rootValue?: any, args?: any, context?: any, info?: any) => boolean | Promise<boolean>;
export type ResolverFn = (rootValue?: any, args?: any, context?: any, info?: any) => AsyncIterator<any>;

export const withFilter = (asyncIteratorFn: ResolverFn, filterFn: FilterFn): ResolverFn => {
  return (rootValue: any, args: any, context: any, info: any): AsyncIterator<any> => {
    const asyncIterator = asyncIteratorFn(rootValue, args, context, info);

    const getNextPromise = () => {
      return new Promise<IteratorResult<any>>((resolve, reject) => {

        let recursionCount = 0;
        const inner = () => {
          recursionCount += 1;
          asyncIterator
            .next()
            .then(payload => {
              if (payload.done === true) {
                resolve(payload);
                return;
              }
              Promise.resolve(filterFn(payload.value, args, context, info))
                .catch(() => false) // We ignore errors from filter function
                .then(filterResult => {
                  if (filterResult === true) {
                    resolve(payload);
                    return;
                  }
                  // Skip the current value and wait for the next one
                  if (recursionCount < 100) {
                    inner();
                  } else {
                    recursionCount = 0;
                    process.nextTick(inner);
                  }
                });
            }).catch((err) => {
              reject(err);
            });
        };

        inner();
      });
    };

    return {
      next() {
        return getNextPromise();
      },
      return() {
        return asyncIterator.return();
      },
      throw(error) {
        return asyncIterator.throw(error);
      },
      [$$asyncIterator]() {
        return this;
      },
    };
  };
};
