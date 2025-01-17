﻿/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

$(document).ready(function () {
    prepareAppBucketTree();
    $('#refreshBuckets').click(function () {
        $('#appBuckets').jstree(true).refresh();
    });

    $('#createNewBucket').click(function () {
        createNewBucket();
    });

    $('#cancella').click(function () {
        deleteBucket();
        deleteObject();
    });


    $('#createBucketModal').on('shown.bs.modal', function () {
        $("#newBucketKey").focus();
    })

    $('#hiddenUploadField').change(function () {
        var node = $('#appBuckets').jstree(true).get_selected(true)[0];
        var _this = this;
        if (_this.files.length == 0) return;
        var file = _this.files[0];
        switch (node.type) {
            case 'bucket':
                var formData = new FormData();
                formData.append('fileToUpload', file);
                formData.append('bucketKey', node.id);

                $.ajax({
                    url: '/api/forge/oss/objects',
                    data: formData,
                    processData: false,
                    contentType: false,
                    type: 'POST',
                    success: function (data) {
                        $('#appBuckets').jstree(true).refresh_node(node);
                        _this.value = '';
                    }
                });
                break;
        }
    });
});

function createNewBucket() {
    var bucketKey = $('#newBucketKey').val();
    var policyKey = $('#newBucketPolicyKey').val()[0];
    jQuery.post({
        url: '/api/forge/oss/buckets',
        contentType: 'application/json',
        data: JSON.stringify({ 'bucketKey': bucketKey, 'policyKey': policyKey }),
        success: function (res) {
            $('#appBuckets').jstree(true).refresh();
            $('#createBucketModal').modal('toggle');
        },
        error: function (err) {
            if (err.status == 409)
                alert('Bucket already exists - 409: Duplicated')
        }
    });
}

function prepareAppBucketTree() {
    $('#appBuckets').jstree({
        'core': {
            'themes': { "icons": true },
            'data': {
                "url": '/api/forge/oss/buckets',
                "dataType": "json",
                'multiple': false,
                "data": function (node) {
                    return { "id": node.id };
                }
            }
        },
        'types': {
            'default': {
                'icon': 'glyphicon glyphicon-question-sign'
            },
            '#': {
                'icon': 'glyphicon glyphicon-cloud'
            },
            'bucket': {
                'icon': 'glyphicon glyphicon-folder-open'
            },
            'object': {
                'icon': 'glyphicon glyphicon-file'
            }
        },
        "plugins": ["types", "state", "sort", "contextmenu"],
        contextmenu: { items: autodeskCustomMenu }
    }).on('loaded.jstree', function () {
        $('#appBuckets').jstree('open_all');
    }).bind("activate_node.jstree", function (evt, data) {
        if (data != null && data.node != null && data.node.type == 'object') {
            $("#forgeViewer").empty();
            var urn = data.node.id;
            getForgeToken(function (access_token) {
                jQuery.ajax({
                    url: 'https://developer.api.autodesk.com/modelderivative/v2/designdata/' + urn + '/manifest',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    success: function (res) {
                        if (res.status === 'success') launchViewer(urn);
                        else $("#forgeViewer").html('The translation job still running: ' + res.progress + '. Please try again in a moment.');
                    },
                    error: function (err) {
                        var msgButton = 'This file is not translated yet! ' +
                            '<button class="btn btn-xs btn-info" onclick="translateObject()"><span class="glyphicon glyphicon-eye-open"></span> ' +
                            'Start translation</button>'
                        $("#forgeViewer").html(msgButton);
                    }
                });
            })
        }
    });
}

function autodeskCustomMenu(autodeskNode) {
    var items;

    switch (autodeskNode.type) {
        case "bucket":
            items = {
                uploadFile: {
                    label: "Upload file",
                    action: function () {
                        uploadFile();
                    },
                    icon: 'glyphicon glyphicon-cloud-upload'
                },
                deleteBucket: {
                    label: "Delete bucket",
                    action: function () {
                        deleteBucket();
                    },
                    icon: 'glyphicon glyphicon-trash'
                }
            };
            break;
        case "object":
            items = {
                translateFile: {
                    label: "Translate",
                    action: function () {
                        var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
                        translateObject(treeNode);
                    },
                    icon: 'glyphicon glyphicon-eye-open'
                },
                deleteManifest: {
                    label: "Delete manifest (viewables)",
                    action: function () {
                        deleteManifest();
                    },
                    icon: 'glyphicon glyphicon-trash'
                },
                deleteBucket: {
                    label: "Delete object",
                    action: function () {
                        deleteObject();
                    },
                    icon: 'glyphicon glyphicon-trash'
                }
            };
            break;
    }

    return items;
}

function uploadFile() {
    $('#hiddenUploadField').click();
}

function deleteBucket() {
    var node = $('#appBuckets').jstree(true).get_selected(true)[0];
    if (node == undefined) return;
    if (node.type != 'bucket') return;
    jQuery.ajax({
        url: '/api/forge/oss/buckets',
        type: 'DELETE',
        contentType: 'application/json',
        data: JSON.stringify({ 'bucketKey': node.id }),
        success: function (res) {
            $('#appBuckets').jstree(true).refresh();
            $('#cancellaModal').modal('toggle');
        },
    });
}

function deleteManifest() {
    var node = $('#appBuckets').jstree(true).get_selected(true)[0];
    if (node == undefined) return;
    if (node.type != 'object') return;
    jQuery.ajax({
        url: '/api/forge/modelderivative/manifest',
        type: 'DELETE',
        contentType: 'application/json',
        data: JSON.stringify({ 'objectName': node.id }),
        success: function (res) {
        },
    });
}

function deleteObject() {
    var node = $('#appBuckets').jstree(true).get_selected(true)[0];
    if (node == undefined) return;
    if (node.type != 'object') return;
    var bucketKey = node.parents[0];
    var objectKey = node.id;
    jQuery.ajax({
        url: '/api/forge/oss/objects',
        type: 'DELETE',
        contentType: 'application/json',
        data: JSON.stringify({ 'bucketKey': bucketKey, 'objectName': objectKey }),
        success: function (res) {
            $('#appBuckets').jstree(true).refresh_node(node.parent);
            $('#cancellaModal').modal('toggle');
        },
    });
}

function translateObject(node) {
    $("#forgeViewer").empty();

    if (node == null) node = $('#appBuckets').jstree(true).get_selected(true)[0];
    var bucketKey = node.parents[0];
    var objectKey = node.id;

    startConnection(function () {
        if (node.text.indexOf('.zip') > 0) {
            $("#rootFileModal").modal();
            $("#translateZipObject").click(function () {
                $('#rootFileModal').modal('toggle');
                jQuery.post({
                    url: '/api/forge/modelderivative/jobs',
                    contentType: 'application/json',
                    data: JSON.stringify({ 'bucketKey': bucketKey, 'objectName': objectKey, 'rootFilename': $("#rootFilename").val(), 'connectionId': connectionId }),
                    success: function (res) {
                        $("#forgeViewer").html('Translation started! Please try again in a moment.');
                    },
                });
            });
        }
        else {
            jQuery.post({
                url: '/api/forge/modelderivative/jobs',
                contentType: 'application/json',
                data: JSON.stringify({ 'bucketKey': bucketKey, 'objectName': objectKey, 'connectionId': connectionId }),
                success: function (res) {
                    $("#forgeViewer").html('Translation started! Model will load when ready...');
                },
            });
        }
    })
}

var connection;
var connectionId;

function startConnection(onReady) {
    if (connection && connection.connectionState) { if (onReady) onReady(); return; }
    connection = new signalR.HubConnectionBuilder().withUrl("/api/signalr/modelderivative").build();
    connection.start()
        .then(function () {
            connection.invoke('getConnectionId')
                .then(function (id) {
                    if (id.indexOf('_') !== -1) {
                        console.log('Restarting...');
                        connection.stop(); // need to fix this..
                        connection = null;
                        startConnection();
                        return;
                    }
                    connectionId = id; // we'll need this...
                    if (onReady) onReady();
                });
        });

    connection.on("extractionFinished", function (data) {
        $("#forgeViewer").empty();
        launchViewer(data.resourceUrn);
    });
}