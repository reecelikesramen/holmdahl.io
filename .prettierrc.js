import * as goTemplate from "prettier-plugin-go-template";

export default {
  plugins: [goTemplate],
  overrides: [
    {
      files: ["*.html"],
      options: {
        parser: "go-template",
      },
    },
  ],
};
