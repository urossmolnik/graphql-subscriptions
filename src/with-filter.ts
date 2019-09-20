import { $$asyncIterator } from 'iterall';

export type FilterFn = (rootValue?: any, args?: any, context?: any, info?: any) => boolean | Promise<boolean>;
export type ResolverFn = (rootValue?: any, args?: any, context?: any, info?: any) => AsyncIterator<any>;

export const withFilter = (asyncIteratorFn: ResolverFn, filterFn: FilterFn): ResolverFn => {
  return (rootValue: any, args: any, context: any, info: any): AsyncIterator<any> => {
    const asyncIterator = asyncIteratorFn(rootValue, args, context, info);

    const getNextPromise = async() => {
      while (true) {
        try {
          const payload = await asyncIterator.next();
          if (payload.done === true) {
            return payload;
          }
          const filterResult = filterFn(payload.value, args, context, info);
          if (filterResult === true) {
            return payload;
          }
        } catch (err) {
          // Errors are ignored
        }

        // Skip the current value and wait for the next one
      }
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
