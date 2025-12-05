/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1030768794")

  // update collection data
  unmarshal({
    "name": "LUOGO"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1030768794")

  // update collection data
  unmarshal({
    "name": "EARTHQUACK"
  }, collection)

  return app.save(collection)
})
