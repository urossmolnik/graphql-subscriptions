import { $$asyncIterator } from 'iterall';

export type FilterFn = (rootValue?: any, args?: any, context?: any, info?: any) => boolean | Promise<boolean>;
export type ResolverFn = (rootValue?: any, args?: any, context?: any, info?: any) => AsyncIterator<any>;

export const withFilter = (asyncIteratorFn: ResolverFn, filterFn: FilterFn): ResolverFn => {
  return (rootValue: any, args: any, context: any, info: any): AsyncIterator<any> => {
    const asyncIterator = asyncIteratorFn(rootValue, args, context, info);

    const getNextPromise = () => {
      return new Promise<IteratorResult<any>>((resolve, reject) => {

        const inner = () => {
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
                  inner();
                  return;
                });
            })
            .catch((err) => {
              // tslint:disable-next-line: no-console
              console.log('DEBUG: with-filter in graphql-subscriptions: asyncIterator.next() returned error');
              reject(err);
              return;
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
