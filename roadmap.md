# Roadmap

- [ ] Redesign app screens from the user's 4 mockups: templates list (actions, default template), template editor sheet (variables + document columns), campaigns list with filters + empty state, import-data screen, flat bottom bar
- [ ] Mobile send flow: pick file → preview rows → pick template → prepare batch
- [ ] Send screen: send from phone (SMS / WhatsApp) or automatically via gateway, report results
- [x] Server: send a batch through the user's gateway in chunks (`POST /batches/{id}/send`)
- [ ] Tie the app to the public site (shared logo/links, "open app" when signed in, install on home screen)
- [ ] Test with a real Excel file on a phone-sized screen, end to end
- [ ] Update phone developer guide
