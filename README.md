# Data on the Ground

Workshop app. Participants (groups) work through the pre-filled GPDP scenario or a scenario
of their own: for each step they record the question, data used, challenges and how they
address them. The facilitator then builds a collective view of the main challenges and how
people handle them.

## Deploy (same as the earlier Netlify app, as a NEW site)

1. Create a new GitHub repository (e.g. `data-on-the-ground`) and upload everything in this
   folder so `public`, `netlify`, `netlify.toml` and `package.json` sit at the top level.
2. In Netlify: Add new site > Import an existing project > GitHub > choose the repository.
3. Add environment variables: `ADMIN_PASSWORD` and `ANTHROPIC_API_KEY`
   (optional: `ANTHROPIC_MODEL`, default `claude-sonnet-5-5`).
4. Deploy (trigger a new deploy after adding variables).
5. Share the site address with participants. Open it yourself, choose Facilitator, sign in.

## Notes
- Responses are stored in Netlify Blobs, one record per group per scenario. Saving again
  updates the same record. Participants can return and reload their answers by entering
  the same group name and scenario.
- Use "Clear all data" in the Facilitator tab to remove test data before the session.
