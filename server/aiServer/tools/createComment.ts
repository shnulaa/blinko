import { userCaller } from '@server/routerTrpc/_app';
import { createTool } from '@mastra/core';
import { z } from 'zod';

export const createCommentTool = createTool({
  id: 'create-comment-tool',
  description: 'Create a comment on a note. Use this to add comments to existing notes.',
  //@ts-ignore
  inputSchema: z.object({
    content: z.string().describe("The content of the comment"),
    noteId: z.number().describe("The ID of the note to comment on"),
    accountId: z.number().describe("The account ID making the comment"),
    guestName: z.string().optional().describe("Optional guest name if not using an account")
  }),
  execute: async ({ context }) => {
    console.log(`Creating comment on note ${context.noteId}: ${context.content}`);
    try {
      const caller = userCaller({
        id: context.accountId.toString(),
        exp: 0,
        iat: 0,
        name: 'Blinko AI',
        sub: context.accountId.toString(),
        role: 'superadmin'
      });
      
      const result = await caller.comments.create({
        content: context.content,
        noteId: context.noteId,
        guestName: context.guestName || 'Blinko AI'
      });
      
      return { success: true, message: "Comment created successfully" };
    } catch (error) {
      console.log(error);
      return { success: false, error: error.message || "Unknown error occurred" };
    }
  }
});
