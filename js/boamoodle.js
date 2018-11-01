// This file is part of BoA
//
// BoA is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// BoA is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with BoA.  If not, see <http://www.gnu.org/licenses/>.

'use strict';

$(function () {

    $.boasearch = function(el, params) {
        var $boasearch = $(el);
        var $boasearchBox;
        var $boasearchSuggestions = $('<ul class="boasearch-suggestions"></ul>');
        var cacheQueries = [];
        var cacheResults = [];
        var requestObjects = [];
        var startRecord = 0;

        $boasearch.wrap('<span class="boasearch-box"></span>');

        $boasearchBox = $boasearch.parent();
        $boasearchBox.append($boasearchSuggestions);

        $boasearchSuggestions.customReset = function() {
            $boasearchSuggestions.empty();
            $boasearchSuggestions.hide();
            $boasearchSuggestions.data('off', true);
        };

        $boasearchSuggestions.customReset();

        if (params.options) {
            params.options = $.extend({}, $.boasearch.defaults.options, params.options);
        }

        if (params.events) {
            params.events = $.extend({}, $.boasearch.defaults.events, params.events);
        }

        if (params.results) {
            params.results = $.extend({}, $.boasearch.defaults.results, params.results);
        }

        $boasearch.conf = $.extend({}, $.boasearch.defaults, params);

        $boasearch.attr('autocomplete', 'off');

        var ferror = function(txt, level) {
            switch(level) {
                case 'dev':
                    $boasearch.conf.debug ? console.log('BoASearch - ' + txt): true;
                break;
                default:
                    console.log('BoASearch - ' + txt);
            }
        };

        // Store a reference to the BoASearch object
        $.data(el, "boasearch", $boasearch);

        // Private methods
        var methods = {
            init: function() {
                if (!$boasearch.conf.apiuri) {
                    ferror('Configuration error: You need set the API URI.')
                    return;
                }

                if ($boasearch.conf.catalogues.length < 1) {
                    ferror('Configuration error: You need set at least one catalogue.')
                    return;
                }

                $boasearch.on('keypress', function(event) {
                    if (event.keyCode) {
                        switch(event.keyCode) {
                            case 13: // Enter
                                event.preventDefault();
                                $boasearchSuggestions.customReset();
                                break;
                            case 27: // Escape
                                $boasearchSuggestions.customReset();
                                break;
                            case 38: // Up
                                if (!$boasearchSuggestions.data('off')) {
                                    methods.previousItemMarkup();
                                }
                                break;
                            case 40: // Down
                                if (!$boasearchSuggestions.data('off')) {
                                    methods.nextItemMarkup();
                                }
                                break;
                        }
                    }
                });

                $boasearch.on('keyup', function(event) {
                    var val = $boasearch.val();

                    var specialKeys = [13, 16, 17, 18, 27, 33, 34, 35, 36, 37, 38, 39, 45, 144];
                    if (!$boasearchSuggestions.data('off')) {
                        specialKeys[specialKeys.length] = 40;
                    }

                    if (event.keyCode && specialKeys.indexOf(event.keyCode) == -1) {
                        if (val.length >= $boasearch.conf.options.minLetters) {
                            $boasearch.printSuggestions(val);
                        }
                        else {
                            $boasearchSuggestions.customReset();
                        }
                    }
                    else if (event.keyCode === 13) {
                        $boasearch.search();
                    }
                });

                $boasearchBox.on('focusout', function(event) {
                    window.setTimeout(function() { $boasearchSuggestions.customReset(); }, 100);
                });
            },

            /**
            * Build a suggestion item
            * @param item the current item data to render
            * @param query the last query submited to the server.
            * */
            getItemMarkup: function(item, query, position) {
                var text = item.query != '' ? methods.highlightString(item.query, query) : '';

                var $item = $('<li>' + text + '</li>');

                $item.on('click', function(){
                    var $this = $(this);
                    $boasearchSuggestions.customReset();
                    $boasearch.val($this.text());
                });

                return $item;
            },

            highlightString: function(str, query) {
                var n = str.toLowerCase().indexOf(query.toLowerCase());
                if (n >= 0) {
                    var before = str.substr(0, n);
                    var word   = str.substr(n, query.length);
                    var after  = str.substr(n + query.length);

                    str = before + '<em>' + word + '</em>' + after;
                }
                return str;
            },

            nextItemMarkup: function() {
                var $current = $boasearchSuggestions.find('.current');
                var oldposition, newposition;

                if ($current.length < 1) {
                    oldposition = -1;
                }
                else {
                    oldposition = $current.index();
                }

                newposition = oldposition + 1;

                if ($boasearchSuggestions.find('> li').length <= newposition) {
                    newposition = 0;
                }

                $current.removeClass('current');
                var $new = $boasearchSuggestions.children().eq(newposition);

                $new.addClass('current');
                $boasearch.val($new.text());
            },

            previousItemMarkup: function() {
                var $current = $boasearchSuggestions.find('.current');
                var oldposition, newposition;

                if ($current.length < 1) {
                    oldposition = -1;
                }
                else {
                    oldposition = $current.index();
                }

                newposition = oldposition - 1;

                if (newposition < 0) {
                    newposition = $boasearchSuggestions.find('> li').length - 1;
                }

                $current.removeClass('current');
                var $new = $boasearchSuggestions.children().eq(newposition);

                $new.addClass('current');
                $boasearch.val($new.text());
            },

            printItemsMarkup: function(title, data, query) {

                if (data.length > 0) {
                    $.each(data, function(k, item){
                        var $item = methods.getItemMarkup(item, query, k);
                        $boasearchSuggestions.append($item);
                    });

                    $boasearchSuggestions.show();
                    $boasearchSuggestions.data('off', false);
                }
            },

            initSearch: function() {
                if (typeof($boasearch.conf.events.onstart) == 'function') {
                    $boasearch.conf.events.onstart(startRecord > 0);
                }
                else {
                    if ($boasearch.conf.results.target) {
                        $($boasearch.conf.results.target).addClass('loading');
                        if (startRecord === 0) {
                            $($boasearch.conf.results.target).empty()
                        }
                    }
                }
            },

            printResultSearch: function(data) {
                if (typeof($boasearch.conf.events.onfound) == 'function') {
                    $boasearch.conf.events.onfound(data);
                }
                else {
                    if ($boasearch.conf.results.target) {
                        var $target = $($boasearch.conf.results.target);
                        $target.removeClass('loading');

                        $.each(data, function(k, item) {
                            var $html = $('<div class="boa-video"></div>');
                            $html.append('<a href="' + item.about + '"><h5>' + item.metadata.general.title.none + '</h5></a>');
                            $html.append('<a href="' + item.about + '"><img src="' + item.about + '.img" /></a>');
                            $html.append('<p>' + item.metadata.general.description.none + '</p>');

                            $target.append($html);
                        });
                    }
                }
            },
        };

        // Public methods
        $boasearch.printSuggestions = function(query) {
            var currentTime = Date.now();

            for (var request in requestObjects) {
                if (request && typeof request === 'object') {
                    request.abort();
                }
            }

            $boasearchSuggestions.customReset();
            requestObjects = [];

            for (var i in $boasearch.conf.catalogues) {
                var catalogue = $boasearch.conf.catalogues[i];

                if (cacheQueries[catalogue.key]
                        && cacheQueries[catalogue.key][query]
                        && cacheQueries[catalogue.key][query].timeQuery > (currentTime - $boasearch.conf.options.cacheLife)) {

                    methods.printItemsMarkup(catalogue.name, cacheQueries[catalogue.key][query].data, query);
                    return true;
                }

                if (!cacheQueries[catalogue.key]) {
                    cacheQueries[catalogue.key] = [];
                }

                var uri = $boasearch.conf.apiuri + '/c/' + catalogue.key + '/queries.json';
                var params = {
                    "q": query,
                    "(n)": $boasearch.conf.options.suggestionsSize
                };

                if ($boasearch.conf.filters.length > 0) {
                    var filters = $boasearch.conf.filters.join(' AND ');
                    params.filter = filters;
                }

                let localcatalogue = catalogue;
                requestObjects[requestObjects.length] = $.get(uri, params, function(data){

                    cacheQueries[localcatalogue.key][query] = {
                        timeQuery: Date.now(),
                        data: []
                    };

                    if (data.length > 0) {
                        data.sort(function(a, b){
                            return b.size - a.size;
                        });

                        cacheQueries[localcatalogue.key][query].data = data;

                        methods.printItemsMarkup(localcatalogue.name, data, query);
                    }
                });
            }
        };

        $boasearch.search = function() {

            var currentTime = Date.now();

            var query = $boasearch.val();

            if(query.length < $boasearch.conf.options.minLetters) {
                return false;
            }

            methods.initSearch();

            if (cacheResults[query] && cacheResults[query].timeQuery > (currentTime - $boasearch.conf.options.cacheLife)) {
                methods.printResultSearch(cacheResults[query].data);
                return true;
            }

            cacheResults[query] = {
                timeQuery: currentTime,
                data: []
            };

            for (var i in $boasearch.conf.catalogues) {
                var catalogue = $boasearch.conf.catalogues[i];

                var uri = $boasearch.conf.apiuri + '/c/' + catalogue.key + '/resources.json';
                var params = {
                    "q": query,
                    "(n)": $boasearch.conf.options.resultsSize,
                    "(s)": startRecord
                };

                if ($boasearch.conf.filters.length > 0) {
                    $.each($boasearch.conf.filters, function(k, filter) {
                        if (typeof(filter.value) == 'object') {
                            $.each(filter.value, function(m, val) {
                                params['(meta)[' + filter.meta + '][' + m + ']'] = val;
                            });
                        }
                        else {
                            params['(meta)[' + filter.meta + ']'] = val;
                        }
                    });
                }

                $.ajax( {
                    url: uri,
                    data: params,
                    dataType: 'json',
                    success: function(data) {
                        $boasearchSuggestions.empty();

                        if (typeof $data === 'object' && $data.error) {
                            $boasearch.conf.events.onerror($data);
                            $data = [];
                        }

                        if (data.length > 0) {
                            data.sort(function(a, b) {
                                return b.size - a.size;
                            });

                            cacheResults[query].data = data;

                        }

                        methods.printResultSearch(data);
                    },
                    error: function(xhr) {
                        var data = xhr.responseText;
                        $boasearch.conf.events.onerror(jQuery.parseJSON(data));
                    },
                    fail: function(xhr) {
                        var data = xhr.responseText;
                        $boasearch.conf.events.onerror(jQuery.parseJSON(data));
                    }
                });
            }

        };

        $boasearch.searchMore = function() {
            startRecord += $boasearch.conf.options.resultsSize;
            $boasearch.search();
        };

        //BoA: Initialize
        methods.init();
    };


    //BoA: Default Settings
    $.boasearch.defaults = {
        apiuri: null,
        catalogues: [],
        filters: [],
        options: {
            suggestionsSize: 10,
            resultsSize: 10,
            minLetters: 3,
            cacheLife: 60000 // 60 seconds
        },
        debug: false,
        results: {
            target: null,
            template: null
        },
        events: {
            onstart: null,
            onfound: null,
            onerror: function(error) {
                console.log('BoASearch - search error');
                console.log(error);
                return true;
            }
        }
    };

    //BoA: Plugin Function
    $.fn.boasearch = function(params, paramval) {
        if (params === undefined) { params = {}; }
        if (typeof params === "object") {
            return this.each(function() {
                new $.boasearch(this, params);
            });
        }
        else {

            var $boasearch = $(this).data('boasearch');
            switch (params) {
                case "search": $boasearch.search(); break;
                case "nextsearch": $boasearch.searchMore(); break;
                case "option": return $boasearch.conf.options[paramval]; break;
            }
        }
    };

    var fn_boautils = function (params) {
        var options = {
            resourcesSlice: '/!/'
        };

        options = $.extend({}, options, params);

        var utils = {
            getFinalUri: function(resource) {
                var finaluri;
                if (resource.manifest.conexion_type == 'external') {
                    finaluri = resource.manifest.url;
                }
                else {
                    finaluri = resource.about + options.resourcesSlice;

                    if (resource.manifest.entrypoint) {
                        if (resource.manifest.alternate) {
                            finaluri += resource.manifest.alternate[1];
                        }
                        else {
                            finaluri += resource.manifest.entrypoint;
                        }
                    }
                }

                return finaluri;
            }
        };

        return utils;
    }

    var boautils = fn_boautils();

    var showOneRecourse = function (data, $searchBox) {
        $searchBox.find('[data-control="show-one"]').empty();
        $("html, body").animate({ scrollTop: $searchBox.find('[data-control="show-one"]').position().top }, 500);

        data.finaluri = boautils.getFinalUri(data);

        var $tpl;
        if (data.metadata.technical.format.indexOf('audio') > -1) {
            $tpl = $('#boa-tpl-audio-item-full');
        }
        if (data.metadata.technical.format.indexOf('video') > -1) {
            $tpl = $('#boa-tpl-video-item-full');
        }
        else {
            return;
        }

        var $item = $tpl.tmpl(data);
        $searchBox.find('[data-control="show-one"]').append($item);

        loadComments(data.about, $searchBox);

        var $submitcomments = $searchBox.find('[data-control="show-one"] .comments-form [type="submit"]');
        var $contentcomments = $searchBox.find('[data-control="show-one"] .comments-form [name="content"]');

        $submitcomments.attr('disabled', true);

        var onchangevalid = function() {
            if ($.trim($contentcomments.val()) == '') {
                $submitcomments.attr('disabled', true);
            }
            else {
                $submitcomments.attr('disabled', false);
            }
        };

        $contentcomments.on('input propertychange paste', onchangevalid);

        $submitcomments.on('click', function() {
            var commentdata = {
                "name": $.trim($('.usertext').text().replace($('.usertext .meta').text(), '')),
                "content": $.trim($contentcomments.val())
            };

            $.post(data.about + '/comments', commentdata, function() {
                $contentcomments.val('');
                loadComments(data.about, $searchBox);
            });

            return false;
        });

        $item.find('[boa-action]').on('click', function() {
            var $this = $(this);
            var $parent = $($this.parents('.item-full')[0]);
            var action = $this.attr('boa-action');

            if (action == 'like' || action == 'dislike') {

                var params = action == 'like' ? {} : { value: 0 };

                $parent.find('.likegroup .active').removeClass('active');

                $.post($parent.attr('boa-about') + '/scores', params, function(data) {})
                .done(function() {
                    $this.addClass('active');
                });

            }
            else if (action == 'open') {
                window.open(data.finaluri, '_blank');
            }
        });
    };

    var loadComments = function(baseuri, $searchBox) {
        $.get(baseuri + '/comments', function(comments) {
            showComments(comments, $searchBox);
        });
    };

    var showComments = function(comments, $searchBox) {
        var $box = $searchBox.find('[data-control="show-one"] .comments-box');
        var $list = $box.find('.comments-list');
        var $msg = $box.find('.alert');
        $list.empty();

        if (comments.length == 0) {
            $msg.show().html('Aún no hay comentarios.');
            $list.hide();
        }
        else {
            $msg.hide();
            $list.show();
            $.each(comments, function(i, comment) {
                var $tplcomment = $('#boa-tpl-comments-item');
                var ago = Math.floor(Date.now() / 1000) - Number(comment.updated_at);

                if (ago <= 60) {
                    ago = ago + ' segundos';
                }
                else if (ago <= 60 * 60) {
                    ago = Math.floor(ago / 60) + ' minutos';
                }
                else if (ago <= 60 * 60 * 24) {
                    ago = Math.floor(ago / (60 * 60)) + ' horas';
                }
                else {
                    ago = Math.floor(ago / (60 * 60 * 24)) + ' dias';
                }

                var datacomment = {
                    "name": comment.owner,
                    "ago": 'Hace ' + ago,
                    "content": comment.content
                };

                var $item = $tplcomment.tmpl(datacomment);
                $list.append($item);
            });
        }
    };

    $('.boa-box').each(function() {
        var $_this = $(this);

        var $searchResult = $_this.find('[data-control="search-result"]');
        var $errorBox = $_this.find('[data-control="errors-box"]');
        var $boaSearch = $_this.find('[data-control="search-text"]');

        $boaSearch.boasearch({
            apiuri: 'http://uri-to-boa-site/api',
            catalogues: [
                { name: 'Engagement', key: 'engagement'},
            ],
            filters: [
                { meta: 'metadata.technical.format', value: ['video', 'audio'] }
            ],
            options: { cacheLife: 0 },
            debug: true,
            events: {
                onstart: function(more) {
                    $searchResult.addClass('loading');
                    $searchResult.show();

                    if (!more) {
                        $searchResult.find('> .boa-content').empty();
                    }
                },
                onfound: function(data) {

                    console.log('Encontrados: ' + data.length + ' resultados');

                    $searchResult.removeClass('loading');
                    var $target = $searchResult.find('> .boa-content');

                    var resultsSize = $boaSearch.boasearch('option', 'resultsSize');

                    if (data.length === 0 || data.length < resultsSize) {
                        $searchResult.find('> button').hide();
                    }

                    var $tpl = $('#boa-tpl-item');

                    $.each(data, function(k, item) {
                        if (item.manifest.conexion_type == 'external') {
                            item.finaluri = item.manifest.url;
                        }
                        else {
                            item.finaluri = item.about + '/!/';

                            if (item.manifest.entrypoint) {
                                item.finaluri += item.manifest.entrypoint;
                            }
                        }

                        var $item = $tpl.tmpl(item);
                        $item.appendTo($target);

                        $item.find('[boa-href]').on('click', function() {
                            var $this = $(this);

                            $.get($this.attr('boa-href'), function(data) {
                                showOneRecourse(data, $_this);
                            });
                        });
                    });
                },
                onerror: function(error) {
                    var $target = $errorBox;
                    $target.empty();

                    var $tpl = $('#boa-tpl-error-item');
                    var $node = $tpl.tmpl(error);
                    $target.append($node);

                    $node.find('button.close').on('click', function() {
                        $node.remove();
                    });

                    console.log(error)

                    $target.removeClass('loading');
                }
            }
        });

        $_this.find('[data-control="search-button"]').on('click', function(){
            $boaSearch.boasearch('search');
        });

        $searchResult.find('> button').on('click', function(){
            $boaSearch.boasearch('nextsearch');
        });

    });

});
