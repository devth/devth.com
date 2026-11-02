# Site link audit — 2026-11-02

## Scope and result

Checked the rendered production build, not just Markdown: **25 HTML documents**, **742 link occurrences**, and **265 unique links** after repairs. The documents include the 404 page and the server-generated MCP help page.

- **180 internal links:** target pages/assets and fragment IDs resolve; no broken internal destinations remain in this inventory.
- **85 external destinations:** 84 returned HTTP 200; 1 blocked automated access. HTTP success alone does not certify a profile or the original content of a redirect; see the follow-ups below.
- No remaining external HTTP 404s or unresolved network failures in this run.
- All four citations that linked to Grokipedia while saying “Wikipedia” now say **Grokipedia**.

Checked at 2026-11-02T21:26:45.198Z. This is a point-in-time audit, not a guarantee that third-party pages will remain available.

## Repairs

Fourteen destination changes, preserving authored prose except the four requested citation-label corrections:

| Reference                             | Repair                                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Understanding Yoneda                  | Use the supplied author permalink: https://bartoszmilewski.com/2013/05/15/understanding-yoneda/.                                                                                            |
| Learn You a Haskell (three links)     | Use corresponding pages on the working learnyouahaskell.github.io mirror, retaining the Monad Laws fragment.                                                                                |
| Javassist                             | Use the project's current official site, https://www.javassist.org/.                                                                                                                        |
| Hacking Java Bytecode for Programmers | Use the same article on the author's jaredfolkins.com site.                                                                                                                                 |
| Learning How to Learn                 | Replace the retired Coursera class URL with the current course.                                                                                                                             |
| NPR sleep article                     | Use HTTPS; confirm the article title and HTTP 200 with an HTTP/1.1 GET after initial automated requests failed.                                                                             |
| Docker Toolbox                        | Link to the archived official repository rather than a retired product route.                                                                                                               |
| Docker host-directory volumes         | Use current bind-mount documentation and its valid syntax fragment.                                                                                                                         |
| Yetibot config sample                 | Link to the historical file pinned at commit bcd6695e6607a173e642e827536db2a3085628bd, rather than a deleted file on master. The article's existing outdated-configuration warning remains. |
| Scala LMS tutorial                    | Remove its nonexistent generated fragment; retain the correct tutorial page.                                                                                                                |
| Scalaz PlusEmpty                      | Correct GitHub's line-range fragment from #L3-7 to #L3-L7.                                                                                                                                  |
| Historical ThrushCond comment         | Point to the existing quoted excerpt on the current article and restore the old comment ID on that excerpt. No comment text was invented.                                                   |

## Follow-ups that cannot be certified

These links were **not silently replaced with guessed destinations**.

| Reference                | Original URL                                                                  | Finding                                                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stack Overflow           | `http://stackoverflow.com/questions/tagged/java-bytecode-asm`                 | HTTP 403 / automated-access challenge. Not confirmed broken; could not certify the tag page.                                                                                                                       |
| Discord profile          | `https://discordapp.com/users/devth.com`                                      | Redirects to discord.com/users/devth.com and returns the Discord app shell. This does not establish that the profile exists; a numeric user ID or a confirmed public profile/invite is needed before replacing it. |
| Techstars legacy event 1 | `http://communities.techstars.com/usa/colorado-springs/startup-weekend/13311` | HTTP 200 after redirect to the generic Techstars communities page, not the historical event. No verified equivalent event page found; left unchanged.                                                              |

The old attendee-resource link, `https://startupweekend.org/attendees/resources`, also redirects to the generic Startup Weekend program page at `https://www.techstars.com/communities/startup-weekend`. It no longer establishes the historical Google Cloud credit offer cited in the post, so it remains unchanged pending a verified archival source.

## Method and limits

- Parse every generated HTML page plus MCP help for anchor/area hrefs; normalize relative URLs and deduplicate destinations. The same external page with a fragment is requested once and its fragment checked separately.
- Resolve internal redirects, files, routes, and named fragments against the generated HTML. Category/search query links share their underlying page.
- Follow external HTTP redirects with bounded concurrency and request deadlines; distinguish HTTP errors, bot challenges, and network failures. Inspect page titles and suspicious generic redirects rather than equating every 200 with the intended content.
- Check HTML fragment IDs. Verify GitHub line targets in Chromium because GitHub implements line navigation with client-side markers rather than conventional static IDs. Verify that the removed Scala LMS fragment has no matching browser target.
- Recheck failed destinations and replacement URLs separately. NPR needed an HTTP/1.1 GET; its returned title matches the cited article.
- Browser regression coverage checks the restored comment link on desktop and mobile Chromium emulation, plus existing navigation lifecycle cases. No Safari or physical-device claim.
- This is a navigation-link audit, not a crawler of linked sites, JavaScript string literals, code examples, or embedded image/script/stylesheet resources. Authenticated or bot-blocked content cannot be certified by this audit.

## External destination inventory

Original outbound URLs are retained below even where they redirect. Fragments are listed separately; GitHub line markers were checked in the browser. “200; follow-up” means reachable but not certified as the intended destination.

| Destination                                                                                                           | HTTP / result    | Final URL when different                                                                                    | Fragment checks                                    | Linked from                                  |
| --------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------- |
| `http://blog.higher-order.com/`                                                                                       | 200              | —                                                                                                           | —                                                  | `/beautiful-constraint`                      |
| `http://blog.jamesdbloom.com/JVMInternals.html`                                                                       | 200              | `https://blog.jamesdbloom.com/JVMInternals.html`                                                            | —                                                  | `/compiled-queries-in-scala`                 |
| `http://communities.techstars.com/usa/colorado-springs/startup-weekend/13311`                                         | 200; follow-up   | `https://www.techstars.com/communities`                                                                     | —                                                  | `/fast-app-deploy-guide-for-startup-weekend` |
| `http://docs.scala-lang.org/overviews/quasiquotes/intro.html`                                                         | 200              | `https://docs.scala-lang.org/overviews/quasiquotes/intro.html`                                              | —                                                  | `/compiled-queries-in-scala`                 |
| `http://eed3si9n.com/learning-scalaz/`                                                                                | 200              | —                                                                                                           | —                                                  | `/overture`                                  |
| `http://eed3si9n.com/learning-scalaz/Monad+laws.html`                                                                 | 200              | —                                                                                                           | —                                                  | `/monad-laws-in-scala`                       |
| `http://mth.io/posts/complexity-and-learning/`                                                                        | 200              | —                                                                                                           | —                                                  | `/overture`                                  |
| `http://scalacheck.org/`                                                                                              | 200              | `https://scalacheck.org/`                                                                                   | —                                                  | `/monad-laws-in-scala`                       |
| `http://scalameter.github.io/`                                                                                        | 200              | —                                                                                                           | —                                                  | `/compiled-queries-in-scala`                 |
| `http://stackoverflow.com/questions/tagged/java-bytecode-asm`                                                         | 403; bot-blocked | `https://stackoverflow.com/questions/tagged/java-bytecode-asm`                                              | —                                                  | `/compiled-queries-in-scala`                 |
| `http://thesecretlivesofdata.com/raft/`                                                                               | 200              | —                                                                                                           | —                                                  | `/overture`                                  |
| `http://www.infoq.com/articles/Secrets-of-the-Bytecode-Ninjas`                                                        | 200              | `https://www.infoq.com/articles/Secrets-of-the-Bytecode-Ninjas/`                                            | —                                                  | `/compiled-queries-in-scala`                 |
| `http://www.infoq.com/presentations/Are-We-There-Yet-Rich-Hickey`                                                     | 200              | `https://www.infoq.com/presentations/Are-We-There-Yet-Rich-Hickey/`                                         | —                                                  | `/beautiful-constraint`                      |
| `http://www.infoq.com/presentations/Value-Values`                                                                     | 200              | `https://www.infoq.com/presentations/Value-Values/`                                                         | —                                                  | `/beautiful-constraint`                      |
| `http://www.manning.com/bjarnason/`                                                                                   | 200              | `https://www.manning.com/books/functional-programming-in-scala`                                             | —                                                  | `/overture`                                  |
| `http://www.michaelpollmeier.com/2016/12/01/scalameta-code-generation-tutorial`                                       | 200              | —                                                                                                           | —                                                  | `/compiled-queries-in-scala`                 |
| `http://yefremov.net/blog/scala-code-generation/`                                                                     | 200              | —                                                                                                           | —                                                  | `/compiled-queries-in-scala`                 |
| `http://yetibot.com/`                                                                                                 | 200              | `https://yetibot.com/`                                                                                      | —                                                  | `/yetibot-on-docker`                         |
| `https://alistapart.com/article/i-am-a-creative/`                                                                     | 200              | —                                                                                                           | —                                                  | `/overture`                                  |
| `https://apocalisp.wordpress.com/2010/07/02/higher-rank-polymorphism-in-scala/`                                       | 200              | —                                                                                                           | —                                                  | `/glossary`                                  |
| `https://bartoszmilewski.com/2013/05/15/understanding-yoneda/`                                                        | 200              | —                                                                                                           | —                                                  | `/glossary`                                  |
| `https://bartoszmilewski.com/2014/10/28/category-theory-for-programmers-the-preface/`                                 | 200              | —                                                                                                           | —                                                  | `/overture`                                  |
| `https://brew.sh/`                                                                                                    | 200              | —                                                                                                           | —                                                  | `/fast-app-deploy-guide-for-startup-weekend` |
| `https://calcite.apache.org/`                                                                                         | 200              | —                                                                                                           | —                                                  | `/compiled-queries-in-scala`                 |
| `https://clojuredocs.org/clojure.core/cond-%3E`                                                                       | 200              | —                                                                                                           | —                                                  | `/thrush-cond-is-not-a-monad`                |
| `https://discordapp.com/users/devth.com`                                                                              | 200; follow-up   | `https://discord.com/users/devth.com`                                                                       | —                                                  | `/about`                                     |
| `https://docs.docker.com/engine/storage/bind-mounts/`                                                                 | 200              | —                                                                                                           | #syntax: found                                     | `/yetibot-on-docker`                         |
| `https://docs.influxdata.com/chronograf/v1.6/administration/config-options`                                           | 200              | `https://docs.influxdata.com/chronograf/v1/administration/config-options/`                                  | #chronograf-service-options: found                 | `/dec-deep-environmental-config`             |
| `https://firebase.google.com/docs/auth/`                                                                              | 200              | —                                                                                                           | —                                                  | `/fast-app-deploy-guide-for-startup-weekend` |
| `https://firebase.google.com/docs/database/`                                                                          | 200              | `https://firebase.google.com/docs/database?hl=ko`                                                           | —                                                  | `/fast-app-deploy-guide-for-startup-weekend` |
| `https://gist.github.com/devth/308da859e5b584340f93`                                                                  | 200              | —                                                                                                           | —                                                  | `/thrush-cond-is-not-a-monad`                |
| `https://gist.github.com/devth/735ddd34e8f29fc6b872`                                                                  | 200              | —                                                                                                           | —                                                  | `/a-simple-type-class`                       |
| `https://github.com/devth`                                                                                            | 200              | —                                                                                                           | —                                                  | site-wide (24 pages)                         |
| `https://github.com/devth/dec`                                                                                        | 200              | —                                                                                                           | —                                                  | `/dec-deep-environmental-config`             |
| `https://github.com/devth/devth.com`                                                                                  | 200              | —                                                                                                           | —                                                  | site-wide (24 pages)                         |
| `https://github.com/docker-archive/toolbox`                                                                           | 200              | —                                                                                                           | —                                                  | `/yetibot-on-docker`                         |
| `https://github.com/facebook/create-react-app`                                                                        | 200              | `https://github.com/react/create-react-app`                                                                 | —                                                  | `/fast-app-deploy-guide-for-startup-weekend` |
| `https://github.com/mpilquist/simulacrum`                                                                             | 200              | `https://github.com/typelevel/simulacrum`                                                                   | —                                                  | `/a-simple-type-class`                       |
| `https://github.com/scalaz/scalaz`                                                                                    | 200              | —                                                                                                           | —                                                  | `/overture`                                  |
| `https://github.com/scalaz/scalaz/blob/series/7.2.x/core/src/main/scala/scalaz/PlusEmpty.scala`                       | 200              | —                                                                                                           | #L3-L7: found-browser-line-markers                 | `/thrush-cond-is-not-a-monad`                |
| `https://github.com/tpolecat/tpolecat.github.io/blob/master/_posts/2013-10-12-typeclass.md`                           | 200              | —                                                                                                           | —                                                  | `/a-simple-type-class`                       |
| `https://github.com/yetibot/yetibot.core/blob/4b607726bae926de31a48bb8a05e7345a8668484/src/yetibot/core/config.clj`   | 200              | `https://github.com/yetibot/core/blob/4b607726bae926de31a48bb8a05e7345a8668484/src/yetibot/core/config.clj` | #L19-L47: found-browser-line-markers               | `/dec-deep-environmental-config`             |
| `https://github.com/yetibot/yetibot/blob/bcd6695e6607a173e642e827536db2a3085628bd/config/config-sample.edn`           | 200              | —                                                                                                           | —                                                  | `/yetibot-on-docker`                         |
| `https://gitlab.com/`                                                                                                 | 200              | `https://about.gitlab.com/`                                                                                 | —                                                  | `/fast-app-deploy-guide-for-startup-weekend` |
| `https://grokipedia.com/page/Ad_hoc_polymorphism`                                                                     | 200              | —                                                                                                           | —                                                  | `/a-simple-type-class`                       |
| `https://grokipedia.com/page/Extensionality`                                                                          | 200              | —                                                                                                           | —                                                  | `/glossary`                                  |
| `https://grokipedia.com/page/Function_composition`                                                                    | 200              | —                                                                                                           | #properties: found                                 | `/thrush-cond-is-not-a-monad`                |
| `https://grokipedia.com/page/Isomorphism`                                                                             | 200              | —                                                                                                           | —                                                  | `/glossary`                                  |
| `https://grokipedia.com/page/List_of_Java_bytecode_instructions`                                                      | 200              | —                                                                                                           | —                                                  | `/compiled-queries-in-scala`                 |
| `https://grokipedia.com/page/Outline_of_algebraic_structures`                                                         | 200              | —                                                                                                           | #overview-and-study-of-algebraic-structures: found | `/thrush-cond-is-not-a-monad`                |
| `https://grokipedia.com/page/parametricity`                                                                           | 200              | —                                                                                                           | —                                                  | `/glossary`                                  |
| `https://grokipedia.com/page/Soli_Deo_gloria`                                                                         | 200              | —                                                                                                           | —                                                  | site-wide (24 pages)                         |
| `https://hn.algolia.com/?query=environment%20variables&sort=byDate&prefix&page=0&dateRange=all&type=story`            | 200              | —                                                                                                           | —                                                  | `/dec-deep-environmental-config`             |
| `https://hub.docker.com/u/yetibot`                                                                                    | 200              | —                                                                                                           | —                                                  | `/yetibot-on-docker`                         |
| `https://kk.org/thetechnium/extropy/`                                                                                 | 200              | —                                                                                                           | —                                                  | `/survive-entropy`                           |
| `https://learnyouahaskell.github.io/a-fistful-of-monads.html`                                                         | 200              | —                                                                                                           | #monad-laws: found                                 | `/monad-laws-in-scala`                       |
| `https://learnyouahaskell.github.io/chapters.html`                                                                    | 200              | —                                                                                                           | —                                                  | `/overture`                                  |
| `https://learnyouahaskell.github.io/types-and-typeclasses.html`                                                       | 200              | —                                                                                                           | —                                                  | `/a-simple-type-class`                       |
| `https://opensource.com/business/14/11/microsoft-dot-net-empower-open-source-communities`                             | 200              | —                                                                                                           | —                                                  | `/essentiality-of-open-source`               |
| `https://pchiusano.github.io/unison/`                                                                                 | 200              | —                                                                                                           | —                                                  | `/unison-talk-at-strangeloop`                |
| `https://scala-blitz.github.io/`                                                                                      | 200              | —                                                                                                           | —                                                  | `/compiled-queries-in-scala`                 |
| `https://scala-lms.github.io/tutorials/02_basics.html`                                                                | 200              | —                                                                                                           | —                                                  | `/compiled-queries-in-scala`                 |
| `https://startupweekend.org/attendees/resources`                                                                      | 200              | `https://www.techstars.com/communities/startup-weekend`                                                     | —                                                  | `/fast-app-deploy-guide-for-startup-weekend` |
| `https://threadreaderapp.com/thread/1084490338629242880.html`                                                         | 200              | —                                                                                                           | —                                                  | `/overture`                                  |
| `https://twitter.com/devth`                                                                                           | 200              | `https://x.com/devth`                                                                                       | —                                                  | `/about`                                     |
| `https://unisonweb.org/`                                                                                              | 200              | `https://www.unison-lang.org/`                                                                              | —                                                  | `/unison-talk-at-strangeloop`                |
| `https://wiki.haskell.org/Monad_laws`                                                                                 | 200              | —                                                                                                           | —                                                  | `/monad-laws-in-scala`                       |
| `https://wiki.haskell.org/Typeclassopedia`                                                                            | 200              | —                                                                                                           | —                                                  | `/a-simple-type-class`                       |
| `https://www.consul.io/docs/agent/options.html`                                                                       | 200              | `https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file`                            | —                                                  | `/dec-deep-environmental-config`             |
| `https://www.coursera.org/learn/learning-how-to-learn`                                                                | 200              | —                                                                                                           | —                                                  | `/on-learning`                               |
| `https://www.elastic.co/guide/en/elasticsearch/reference/current/settings.html`                                       | 200              | `https://www.elastic.co/docs/deploy-manage/deploy/self-managed/configure-elasticsearch`                     | —                                                  | `/dec-deep-environmental-config`             |
| `https://www.haskell.org/haskellwiki/Existential_type`                                                                | 200              | `https://wiki.haskell.org/Existential_type`                                                                 | —                                                  | `/glossary`                                  |
| `https://www.jaredfolkins.com/hacking-java-bytecode-for-programmers-part1-the-birds-and-the-bees-of-hex-editing/`     | 200              | —                                                                                                           | —                                                  | `/compiled-queries-in-scala`                 |
| `https://www.javassist.org/`                                                                                          | 200              | —                                                                                                           | —                                                  | `/compiled-queries-in-scala`                 |
| `https://www.last.fm/user/trevorhartman`                                                                              | 200              | —                                                                                                           | —                                                  | `/about`                                     |
| `https://www.manning.com/books/functional-programming-in-scala`                                                       | 200              | —                                                                                                           | —                                                  | `/beautiful-constraint`                      |
| `https://www.npr.org/sections/health-shots/2013/10/18/236211811/brains-sweep-themselves-clean-of-toxins-during-sleep` | 200              | —                                                                                                           | —                                                  | `/on-learning`                               |
| `https://www.strava.com/athletes/devth`                                                                               | 200              | —                                                                                                           | —                                                  | `/about`                                     |
| `https://www.technologyreview.com/s/531911/isaac-asimov-asks-how-do-people-get-new-ideas/`                            | 200              | `https://www.technologyreview.com/2014/10/20/169899/isaac-asimov-asks-how-do-people-get-new-ideas/`         | —                                                  | `/overture`                                  |
| `https://www.youtube.com/watch?v=gCWtkvDQ2ZI&feature=youtu.be`                                                        | 200              | —                                                                                                           | —                                                  | `/unison-talk-at-strangeloop`                |
| `https://www.youtube.com/watch?v=GqmsQeSzMdw`                                                                         | 200              | —                                                                                                           | —                                                  | `/beautiful-constraint`                      |
| `https://www.youtube.com/watch?v=OV5J6BfToSw`                                                                         | 200              | —                                                                                                           | —                                                  | `/overture`                                  |
| `https://x.com/devth`                                                                                                 | 200              | —                                                                                                           | —                                                  | site-wide (24 pages)                         |
| `https://yetibot.com/`                                                                                                | 200              | —                                                                                                           | —                                                  | `/about`, `/dec-deep-environmental-config`   |
| `https://yetibot.com/ops-guide`                                                                                       | 200              | —                                                                                                           | —                                                  | `/yetibot-on-docker`                         |

## Internal destination inventory

All target files/routes and requested fragments below resolve in the generated build. Historical route aliases are resolved through the generated redirect map.

| Destination                                                                | Result   |
| -------------------------------------------------------------------------- | -------- |
| `/`                                                                        | ok       |
| `/?category=config#writing`                                                | ok       |
| `/?category=culture#writing`                                               | ok       |
| `/?category=eng-practices#writing`                                         | ok       |
| `/?category=infra#writing`                                                 | ok       |
| `/?category=infrastructure#writing`                                        | ok       |
| `/?category=learning#writing`                                              | ok       |
| `/?category=methodology#writing`                                           | ok       |
| `/?category=notes#writing`                                                 | ok       |
| `/?category=oss#writing`                                                   | ok       |
| `/?category=philosophy#writing`                                            | ok       |
| `/?category=plt#writing`                                                   | ok       |
| `/?category=process#writing`                                               | ok       |
| `/?category=scala#writing`                                                 | ok       |
| `/?category=talks#writing`                                                 | ok       |
| `/?category=unison#writing`                                                | ok       |
| `/?category=yetibot#writing`                                               | ok       |
| `/#main`                                                                   | ok       |
| `/#top`                                                                    | ok       |
| `/404.html#main`                                                           | ok       |
| `/404.html#top`                                                            | ok       |
| `/a-simple-type-class`                                                     | ok       |
| `/a-simple-type-class#conclusion`                                          | ok       |
| `/a-simple-type-class#further-reading`                                     | ok       |
| `/a-simple-type-class#main`                                                | ok       |
| `/a-simple-type-class#rationale`                                           | ok       |
| `/a-simple-type-class#scalaz`                                              | ok       |
| `/a-simple-type-class#simple`                                              | ok       |
| `/a-simple-type-class#syntax`                                              | ok       |
| `/a-simple-type-class#top`                                                 | ok       |
| `/about`                                                                   | ok       |
| `/about#main`                                                              | ok       |
| `/about#top`                                                               | ok       |
| `/beautiful-constraint`                                                    | ok       |
| `/beautiful-constraint#composition`                                        | ok       |
| `/beautiful-constraint#constraint-as-freedom`                              | ok       |
| `/beautiful-constraint#editor`                                             | ok       |
| `/beautiful-constraint#functional-programming`                             | ok       |
| `/beautiful-constraint#further-exploration`                                | ok       |
| `/beautiful-constraint#immutability`                                       | ok       |
| `/beautiful-constraint#keyboard`                                           | ok       |
| `/beautiful-constraint#main`                                               | ok       |
| `/beautiful-constraint#referential-transparency`                           | ok       |
| `/beautiful-constraint#terminal`                                           | ok       |
| `/beautiful-constraint#top`                                                | ok       |
| `/compiled-queries-in-scala`                                               | ok       |
| `/compiled-queries-in-scala#a-query-system`                                | ok       |
| `/compiled-queries-in-scala#asm`                                           | ok       |
| `/compiled-queries-in-scala#bytecode-primer`                               | ok       |
| `/compiled-queries-in-scala#compiled-queries-with-asm`                     | ok       |
| `/compiled-queries-in-scala#further-reading`                               | ok       |
| `/compiled-queries-in-scala#main`                                          | ok       |
| `/compiled-queries-in-scala#next-steps`                                    | ok       |
| `/compiled-queries-in-scala#scala-quasiquotes`                             | ok       |
| `/compiled-queries-in-scala#top`                                           | ok       |
| `/cosmos`                                                                  | ok       |
| `/cosmos#main`                                                             | ok       |
| `/cosmos#top`                                                              | ok       |
| `/dec-deep-environmental-config`                                           | ok       |
| `/dec-deep-environmental-config#conclusion`                                | ok       |
| `/dec-deep-environmental-config#future`                                    | ok       |
| `/dec-deep-environmental-config#in-the-wild`                               | ok       |
| `/dec-deep-environmental-config#introducing-dec-deep-environmental-config` | ok       |
| `/dec-deep-environmental-config#main`                                      | ok       |
| `/dec-deep-environmental-config#schema`                                    | ok       |
| `/dec-deep-environmental-config#symmetry`                                  | ok       |
| `/dec-deep-environmental-config#top`                                       | ok       |
| `/dumb-yaml-ci`                                                            | ok       |
| `/dumb-yaml-ci#main`                                                       | ok       |
| `/dumb-yaml-ci#top`                                                        | ok       |
| `/essentiality-of-open-source`                                             | ok       |
| `/essentiality-of-open-source#epilogue`                                    | ok       |
| `/essentiality-of-open-source#essentiality`                                | ok       |
| `/essentiality-of-open-source#it-legitimizes-your-work`                    | ok       |
| `/essentiality-of-open-source#it-sharpens-your-skills`                     | ok       |
| `/essentiality-of-open-source#main`                                        | ok       |
| `/essentiality-of-open-source#social-responsibility`                       | ok       |
| `/essentiality-of-open-source#top`                                         | ok       |
| `/fast-app-deploy-guide-for-startup-weekend`                               | ok       |
| `/fast-app-deploy-guide-for-startup-weekend#caveats`                       | ok       |
| `/fast-app-deploy-guide-for-startup-weekend#closing-thoughts`              | ok       |
| `/fast-app-deploy-guide-for-startup-weekend#deployment-on-gitlab-pages`    | ok       |
| `/fast-app-deploy-guide-for-startup-weekend#gitlab`                        | ok       |
| `/fast-app-deploy-guide-for-startup-weekend#main`                          | ok       |
| `/fast-app-deploy-guide-for-startup-weekend#nodejs-react-app`              | ok       |
| `/fast-app-deploy-guide-for-startup-weekend#prerequisites`                 | ok       |
| `/fast-app-deploy-guide-for-startup-weekend#tech`                          | ok       |
| `/fast-app-deploy-guide-for-startup-weekend#top`                           | ok       |
| `/feed.xml`                                                                | ok-asset |
| `/glossary`                                                                | ok       |
| `/glossary#domain-and-codomain`                                            | ok       |
| `/glossary#existential-types`                                              | ok       |
| `/glossary#extensionality-and-intensionality`                              | ok       |
| `/glossary#isomorphism`                                                    | ok       |
| `/glossary#main`                                                           | ok       |
| `/glossary#natural-transformation`                                         | ok       |
| `/glossary#parametricity`                                                  | ok       |
| `/glossary#partial-function`                                               | ok       |
| `/glossary#rank-1-polymorphic-function`                                    | ok       |
| `/glossary#rank-2-polymorphic-function`                                    | ok       |
| `/glossary#top`                                                            | ok       |
| `/glossary#total-function`                                                 | ok       |
| `/hover-lab`                                                               | ok       |
| `/hover-lab#main`                                                          | ok       |
| `/hover-lab#top`                                                           | ok       |
| `/iteration-and-play`                                                      | ok       |
| `/iteration-and-play#main`                                                 | ok       |
| `/iteration-and-play#top`                                                  | ok       |
| `/leave-it-better`                                                         | ok       |
| `/leave-it-better#main`                                                    | ok       |
| `/leave-it-better#top`                                                     | ok       |
| `/monad-laws-in-scala`                                                     | ok       |
| `/monad-laws-in-scala#associativity`                                       | ok       |
| `/monad-laws-in-scala#associativity-1`                                     | ok       |
| `/monad-laws-in-scala#further-reading`                                     | ok       |
| `/monad-laws-in-scala#left-identity`                                       | ok       |
| `/monad-laws-in-scala#left-identity-1`                                     | ok       |
| `/monad-laws-in-scala#list`                                                | ok       |
| `/monad-laws-in-scala#main`                                                | ok       |
| `/monad-laws-in-scala#option`                                              | ok       |
| `/monad-laws-in-scala#right-identity`                                      | ok       |
| `/monad-laws-in-scala#right-identity-1`                                    | ok       |
| `/monad-laws-in-scala#the-end`                                             | ok       |
| `/monad-laws-in-scala#top`                                                 | ok       |
| `/on-learning`                                                             | ok       |
| `/on-learning#abstract-concepts`                                           | ok       |
| `/on-learning#activity`                                                    | ok       |
| `/on-learning#brain-facts`                                                 | ok       |
| `/on-learning#chunking`                                                    | ok       |
| `/on-learning#environment`                                                 | ok       |
| `/on-learning#further-reading`                                             | ok       |
| `/on-learning#how-to-form-a-chunk`                                         | ok       |
| `/on-learning#main`                                                        | ok       |
| `/on-learning#memory`                                                      | ok       |
| `/on-learning#modes`                                                       | ok       |
| `/on-learning#sleeping`                                                    | ok       |
| `/on-learning#techniques`                                                  | ok       |
| `/on-learning#top`                                                         | ok       |
| `/open-source-culture`                                                     | ok       |
| `/open-source-culture#main`                                                | ok       |
| `/open-source-culture#solution`                                            | ok       |
| `/open-source-culture#top`                                                 | ok       |
| `/overture`                                                                | ok       |
| `/overture#distributed-systems`                                            | ok       |
| `/overture#functional-programming`                                         | ok       |
| `/overture#main`                                                           | ok       |
| `/overture#philosophy`                                                     | ok       |
| `/overture#recommended-works`                                              | ok       |
| `/overture#top`                                                            | ok       |
| `/overture#writing`                                                        | ok       |
| `/survive-entropy`                                                         | ok       |
| `/survive-entropy#fast-forward`                                            | ok       |
| `/survive-entropy#focus`                                                   | ok       |
| `/survive-entropy#forces-of-extropy`                                       | ok       |
| `/survive-entropy#further-reading`                                         | ok       |
| `/survive-entropy#main`                                                    | ok       |
| `/survive-entropy#top`                                                     | ok       |
| `/thrush-cond-is-not-a-monad`                                              | ok       |
| `/thrush-cond-is-not-a-monad#comment-2082941866`                           | ok       |
| `/thrush-cond-is-not-a-monad#functor`                                      | ok       |
| `/thrush-cond-is-not-a-monad#main`                                         | ok       |
| `/thrush-cond-is-not-a-monad#monad`                                        | ok       |
| `/thrush-cond-is-not-a-monad#monoid-via-plusempty`                         | ok       |
| `/thrush-cond-is-not-a-monad#semigroup`                                    | ok       |
| `/thrush-cond-is-not-a-monad#top`                                          | ok       |
| `/unison-talk-at-strangeloop`                                              | ok       |
| `/unison-talk-at-strangeloop#main`                                         | ok       |
| `/unison-talk-at-strangeloop#top`                                          | ok       |
| `/yetibot-on-docker`                                                       | ok       |
| `/yetibot-on-docker#main`                                                  | ok       |
| `/yetibot-on-docker#top`                                                   | ok       |
| `/you-might-not-want-a-monorepo`                                           | ok       |
| `/you-might-not-want-a-monorepo#go-all-in`                                 | ok       |
| `/you-might-not-want-a-monorepo#main`                                      | ok       |
| `/you-might-not-want-a-monorepo#monorepos-increase-coupling`               | ok       |
| `/you-might-not-want-a-monorepo#monorepos-introduce-problems`              | ok       |
| `/you-might-not-want-a-monorepo#single-language-vs-multi-language`         | ok       |
| `/you-might-not-want-a-monorepo#so-whats-the-point`                        | ok       |
| `/you-might-not-want-a-monorepo#top`                                       | ok       |
| `/you-might-not-want-a-monorepo#vendors-as-outsourced-experts`             | ok       |
