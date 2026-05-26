export { config } from "./config.js";
export { getDb, closeDb } from "./mongo-client.js";

export { explainSchema, explain, type ExplainInput } from "./tools/explain.js";
export {
  explainAnalyzeSchema,
  explainAnalyze,
  type ExplainAnalyzeInput,
} from "./tools/explain-analyze.js";
export { findSchema, find, type FindInput } from "./tools/find.js";
export { aggregateSchema, aggregate, type AggregateInput } from "./tools/aggregate.js";
export { indexListSchema, indexList, type IndexListInput } from "./tools/index-list.js";
export {
  indexSuggestSchema,
  indexSuggest,
  type IndexSuggestInput,
} from "./tools/index-suggest.js";
export {
  slowQueriesSchema,
  slowQueries,
  type SlowQueriesInput,
} from "./tools/slow-queries.js";
