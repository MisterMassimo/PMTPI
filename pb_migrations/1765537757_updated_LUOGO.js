/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1030768794")

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "geoPoint3416046103",
    "name": "coordinate",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "geoPoint"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1030768794")

  // remove field
  collection.fields.removeById("geoPoint3416046103")

  return app.save(collection)
})
