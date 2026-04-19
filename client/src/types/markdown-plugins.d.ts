declare module "markdown-it-footnote" {
  import type MarkdownIt from "markdown-it";

  const markdownItFootnote: MarkdownIt.PluginSimple;
  export default markdownItFootnote;
}

declare module "markdown-it-task-lists" {
  import type MarkdownIt from "markdown-it";

  interface MarkdownItTaskListOptions {
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }

  const markdownItTaskLists: MarkdownIt.PluginWithOptions<MarkdownItTaskListOptions>;
  export default markdownItTaskLists;
}
