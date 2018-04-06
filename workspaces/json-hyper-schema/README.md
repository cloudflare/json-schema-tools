# JSON Hyper-Schema

This package is the beginning of an implemenation of [JSON Hyper-Schema](http://json-schema.org/latest/json-schema-hypermedia.html).  It currently only provides utilities to look up a link by `rel`, `method`, and/or `title`, and for resolving [URI Templates](https://tools.ietf.org/html/rfc6570) from instance data.

## URI Template resolution

Resolving URI Templates in JSON Hyper-Schema involves some additional steps beyond what is covered in the URI Template RFC.

Currently, with draft-04 hyper-schemas, URI Templates can use dot-separated names to index into the instance object.  This is not part of draft-04, and the function does not implement draft-04's preprocessing options.

In the future, URI Template resolution will support the [full draft-07 resolution process](http://json-schema.org/draft-07/json-schema-hypermedia.html#rfc.section.7.2), including user input.
