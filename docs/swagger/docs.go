package swagger

import "github.com/swaggo/swag"

const docTemplate = `{
    "schemes": ["http", "https"],
    "swagger": "2.0",
    "info": {
        "description": "FreshMart API documentation",
        "title": "FreshMart API",
        "contact": {},
        "version": "v1"
    },
    "basePath": "/api/v1",
    "paths": {}
}`

var SwaggerInfo = &swag.Spec{
	Version:          "v1",
	Host:             "",
	BasePath:         "/api/v1",
	Schemes:          []string{"http", "https"},
	Title:            "FreshMart API",
	Description:      "FreshMart API documentation",
	InfoInstanceName: "swagger",
	SwaggerTemplate:  docTemplate,
}

func init() {
	swag.Register(SwaggerInfo.InstanceName(), SwaggerInfo)
}
