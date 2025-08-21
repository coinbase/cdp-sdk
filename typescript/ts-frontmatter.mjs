// @ts-check
import { MarkdownPageEvent } from "typedoc-plugin-markdown";

/**
 * @param {import('typedoc-plugin-markdown').MarkdownApplication} app
 */
export function load(app) {
  app.renderer.on(
    MarkdownPageEvent.BEGIN,
    /** @param {import('typedoc-plugin-markdown').MarkdownPageEvent} page */
    page => {
      /**
       * Update page.frontmatter object using information from the page model
       */

      // Set the frontmatter title to just the name
      page.frontmatter = {
        // Just use the plain name
        title: page.model?.name || "",
        sidebarTitle: page.model?.name || "",
        // spread the existing frontmatter
        ...page.frontmatter,
      };
    },
  );
}
