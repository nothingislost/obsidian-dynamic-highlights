export const queriesSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  additionalProperties: {
    $ref: "#/definitions/SearchQuery",
  },
  definitions: {
    SearchQuery: {
      properties: {
        class: {
          type: "string",
        },
        color: {
          type: ["null", "string"],
        },
        css: {
          type: "string",
        },
        enabled: {
          type: "boolean",
        },
        mark: {
          items: {
            enum: ["end", "group", "line", "match", "start"],
            type: "string",
          },
          type: "array",
        },
        query: {
          type: "string",
        },
        regex: {
          type: "boolean",
        },
      },
      required: ["class", "color", "query", "regex"],
      type: "object",
    },
  },
  type: "object",
};
