# Map files to load

Put a linkage-map file here and it is loaded into the site's Linkage maps page
the next time the data is rebuilt (`python3 scripts/rebuild_all.py`, or just
`python3 scripts/build_linkage_maps.py`).

GrainGenes does not allow its map records to be downloaded by a script, so the
marker positions of most maps in its catalogue have to be fetched by a person:

1. Open the map in GrainGenes (the "GrainGenes" link in the Record column of
   the Linkage maps table), or in its CMap viewer.
2. Download or copy the map data - marker, chromosome, position.
3. Save it here as `.csv`, `.tsv` or `.txt`.

## What a file must contain

One row per marker, with a header row. Column names are matched loosely:

| Column | Accepted header names |
|---|---|
| marker | `marker`, `locus`, `feature_name`, `name` |
| linkage group | `linkage_group`, `chromosome`, `chr`, `lg`, `map_name`, `group` |
| position in cM | `cm`, `position`, `position_cm`, `feature_start`, `start`, `location` |

A CMap "download map data" export works as it is.

## Which map it becomes

The file name (without extension) is the map name. If it is the same as a map
already in the catalogue - for example `Wheat-2018-NAM1-Berkut-x-DharwarDry.tsv`
- the positions are attached to that catalogue record, which then becomes
viewable. Otherwise the file is added as a new map.

Rows whose linkage group is not a wheat chromosome (1A-7D), or whose position
is not a number, are skipped and counted in the build log.
