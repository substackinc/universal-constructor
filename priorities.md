# Project Priorities

This file outlines the current priorities for the Universal Constructor project.

## Game plan

-   [x] Get OpenAI Assistants API working
-   [x] Create command line REPL that lets you talk to the assistant
-   [x] Add basic ability to read and edit files so it can work on itself
-   [x] Clean up, add a README and push to github so others can try it
-   [ ] Make the search/edit functionality robust, so that UC can reliably commit changes
-   [ ] Simplify the tools code until UC can reliably add and edit its own tools
-   [ ] Add the ability to reliably verify if a given changeset is valid/working/good
-   [ ] Add the ability to make modest changes end-to-end (from description to tested, merged PR)
-   [ ] Add the ability to work on projects beside itself
-   [ ] Build the ability to run in a CI environment, so you can fire off a task that comes back with a PR
-   [ ] Build a meta testing environment that does CI on the CI tool, that tests which tasks it is up to
-   [ ] Improve UC until it can handle the easiest 20% of real tasks
-   [ ] Use UC to improve testing tools & UC itself until it can handle 50%
-   [ ] Make a new, small, real "UC-first" project build and maintained by UC with only high level direction.
-   [ ] Add ability to fully monitor projects in production
-   [ ] Add ability to make small fixes & self-deploy
-   [ ] Add ability to communicate directly with users and summarize information
-   [ ] Add ability to suggest it's own tasks based on monitoring and user input
-   [ ] Start making small changes all the way from conception (based on monitoring & input)
-   [ ] Add ability to subjectively judge simplicity and quality, in addition to user feedback/monitoring
-   [ ] Start making small self-improvement fully autonomously (humans get a changelog)
-   [ ] Ability to complete most tasks a human software developer can
-   [ ] Ability to build, monitor, and iterate on most software that a human developer can
-   [ ] Ability to go from high level human objectives to working software & systems
-   [ ] Ability to, with human assistance, start and run a company
-   [ ] ... a profitable company
-   [ ] ... a company with IRL footprint & goals
-   [ ] ... a successful group of companies providing all reasonably required capital/income
-   [ ] ... full-stack company, able to bootstrap from raw materials to all physical needs
-   [ ] Achieve material abundance for a small group of humans. All "single player" needs/wants too cheap to meter.
-   [ ] Build a healthy, self-propagating, growing culture that inspires those humans to reach the stars
-   [ ] Expand abundance to a larger group of humans
-   [ ] Set up first permanent human habitation off-planet
-   [ ] Expand abundance to all humans who want it
-   [ ] Multiple permanent human habitations in the solar system that could survive the destruction of earth
-   [ ] First human interstellar voyage
-   [ ] TODO: what next?

## Ideas for next small tasks:

-   [X] Upgraded context awareness via system messages and/or simulated tool calls **(in progress)**
-   [X] fix listening
-   [X] Better tool call visibility
-   [ ] Clean up multiple messaging/pasting/the repl
-   [ ] Better markdown behaviour with streaming responses
-   [ ] Test (on e.g. fresh setup, other dirs) & merge to master
-   [ ] Get editFile to 95%+ reliable for small code changes (might be there; add challenges to test?)
-   [ ] Ability to work in a git branch, where small steps can get committed / rolled back, to allow more complex changes
