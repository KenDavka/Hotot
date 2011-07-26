if (typeof ui == 'undefined') var ui = {};
ui.Slider = {

me: {},

id: '',

current: 'home',

column_num: 1,

tweet_blocks: [],

displayed: [],

isSliderMenuClosed: true,

init:
function init () {
    this.id = '#main_page_slider';
    this.me = $('#main_page_slider');
    
    $('#indication').find('.shape').click(
    function (event) {
        $(this).parent().children('.idx_btn').click();
    });

    $('#indication .indicator_btn').live('click', function (ev) {
        var view_name = $(this).attr('href').substring(1);
        if (view_name == 'add') {
            if (ui.Slider.isSliderMenuClosed) {
                ui.Slider.openSliderMenu();
            } else {
                ui.Slider.closeSliderMenu();
            }
        } else if (view_name == 'compose') {
            if (ui.StatusBox.is_closed) {
                ui.StatusBox.open();
            } else {
                ui.StatusBox.close();
            }
        } else if (view_name == 'hotot') {
            if (ui.Header.isHototMenuClosed) {
                ui.Header.openHototMenu();
            } else {
                ui.Header.closeHototMenu();
            }
        } else {
            if (ui.Slider.current == view_name) {
                ui.Main.move_to_tweet('top');
            } else { 
                ui.Slider.slide_to(view_name);
            }
        }
        return false;
    });

    $('#slider_menu a').click(function(){
        var name = $(this).attr('href').substring(1);
        var ret = ui.Slider.addDefaultView(name);
        if (ret == true) {
            $(this).addClass('checked');
            if (name != 'search') {
                ui.Main.views[name].load();
            }
        }
        ui.Slider.slide_to(name);
        ui.Slider.closeSliderMenu();
        return false;
    });
    $('#slider_menu').mouseleave(
    function (event) {
        ui.Slider.closeSliderMenu();
    });

    $('#view_title_bar .close_btn').click(function () {
        var name = $(this).parent().attr('name');
        ui.Main.views[name].destroy();
    });
    
    ui.Slider.view_titles = $('.view_title');
},

add:
function add(name, indicator_opts, view_opts) {
    if (ui.Slider.tweet_blocks.indexOf(name) == -1) {
        ui.Slider.add_view(name, view_opts);
        ui.Slider.add_indicator(name, indicator_opts);
    } else {
        ui.Slider.slide_to(name);
    }
},

add_indicator:
function add_indicator(name, opts) {
    // create & add indicator_btns
    var html = ui.Template.form_indicator(name, opts.title, opts.icon);
    if (name == 'search') {
        html = html.replace('{%STICK%}', 'stick_right');
        ui.Slider.tweet_blocks.splice(ui.Slider.tweet_blocks.length, 0, 'search');
    } else {
        html = html.replace('{%STICK%}', 'no_stick');
        ui.Slider.tweet_blocks.splice(ui.Slider.tweet_blocks.length - 1, 0, name);
    }
    $(html).insertBefore($('#indicator_add_btn').parent());
},

add_view:
function add_view(name, opts) {
    // create & add view
    // bind ListView to DOM
    // register at daemon or streaming listener (optional) 
    if (name == 'search') {
        $('#main_page_slider').append(ui.Template.form_view(name, opts.title, 'tweetview'));
    } else {
        $(ui.Template.form_view(name, opts.title, 'tweetview'))
            .insertBefore('#search_tweetview');
    }
    // add to ui.Main.views
    var v = new widget.ListView('#'+name+'_tweetview', name, opts);
    ui.Main.views[name] = v;
    // add to daemon
    if (opts.method == 'poll') { 
        if (opts.interval == 0) {
            ui.Main.views[name].load();
        } else if (0 < opts.interval){
            daemon.register_poll_view(v);   
        }
    } else if (opts.method == 'push') {
        daemon.register_push_view(v);
    } else {
        // nothing to do
    }
    update_tweet_block_width();            
},

remove:
function remove(name) {
    if (ui.Slider.tweet_blocks.indexOf(name) != -1) {
        ui.Slider.remove_indicator(name);
        ui.Slider.remove_view(name);
        if (name == ui.Slider.current) {
            var prev = ui.Slider.tweet_blocks[ui.Slider.get_page_pos(name) - 1];
            var next = ui.Slider.tweet_blocks[ui.Slider.get_page_pos(name) + 1];
            if (prev) {
                ui.Slider.slide_to(prev);
            } else if (next) {
                ui.Slider.slide_to(next);
            }
        } else {
            ui.Slider.slide_to(ui.Slider.current);
        }
    }
},

remove_view:
function remove_view(name) {
    var v = ui.Main.views[name];
    // remove from daemon
    daemon.unregister_poll_view(v);
    daemon.unregister_push_view(v);
    // remove from DOM
    $('#'+v.name+'_tweetview').remove();
    // remove from ui.Main.views
    delete ui.Main.views[name];
    v.clear();
    v.destroy();
    update_tweet_block_width();            
},

remove_indicator:
function remove_indicator(name) {
    var idx = ui.Slider.tweet_blocks.indexOf(name);
    ui.Slider.tweet_blocks.splice(idx, 1);
    $('#indicator_btns li[name="'+name+'"]').remove();
},

slide_to:
function slide_to(id) {
/* = 3 columns as example = 
 * idx:         0   1   2   3   4   5
 * fixed_idx:   0   1   2   3   3   3
 * page_ofst:   0   0   1   2   3   3
 * displayed:  012 012 123 234 345 335
 */
    var idx = ui.Slider.get_page_pos(id);
    var width = globals.tweet_block_width;
    var max_col_num = ui.Slider.tweet_blocks.length;
    ui.Slider.current = id;

    var fixed_idx = idx + ui.Slider.column_num < max_col_num
        ? idx: max_col_num - ui.Slider.column_num; 
    var page_offset = (fixed_idx == idx 
            && 0 <= fixed_idx - parseInt(ui.Slider.column_num/2))
        ? fixed_idx - parseInt(ui.Slider.column_num/2) : fixed_idx;

    $('#main_page_slider').css('width', max_col_num + '00%');
    // slide page
    if (conf.get_current_profile()) {
        if (conf.get_current_profile().preferences.effects_level != 0) {
            ui.Slider.me.stop().animate(
                {marginLeft: (0 - page_offset * width) +'px'}
                , 500
                , function () {
                    $('#main_page_slider').css('width', 'auto');
                }
            );
        } else {
            ui.Slider.me.css('marginLeft', (0 - page_offset * width + ui.Slider.column_num) +'px');
            $('#main_page_slider').css('width', 'auto');
        }
    }

    // get displayed pages
    ui.Slider.displayed = [];
    for (var i = 0; i < ui.Slider.column_num; i += 1)
    {
        if (i + page_offset < 0) { continue; }
        ui.Slider.displayed.push(ui.Slider.tweet_blocks[i + page_offset]);
    }
    // update view title
    for (var i = 0; i < ui.Slider.column_num; i += 1) {
        var view_title = $(ui.Slider.view_titles[i]);
        view_title.attr('name', ui.Slider.displayed[i])
        view_title.children('.title')
            .text(ui.Main.views[ui.Slider.displayed[i]].title);
        if (ui.Slider.displayed[i] == 'home' || ui.Slider.displayed[i] == 'search') {
            view_title.children('.close_btn').hide();
        } else {
            view_title.children('.close_btn').show();
        }
    }
     
    // change indicators style
    var all_btns = $('#indication').find('.indicator_btn');
    var cur_sel = $.map(ui.Slider.displayed, function (item) {
        return $('#indication .indicator_btn[href="#'+item+'"]');
    });
    if (cur_sel.length == 0) return;
    $('#indication_light').stop().animate(
          { 'left': (cur_sel[0].parent().get(0).offsetLeft + 1) + 'px',
            'width': (
                  cur_sel[cur_sel.length - 1].parent().get(0).offsetLeft 
                + cur_sel[cur_sel.length - 1].parent().width()
                - cur_sel[0].parent().get(0).offsetLeft  
                ) + 'px'
          }
        , 200 
        , function () {
            // remove selected style from the pre ones
            if (all_btns) {
                all_btns.removeClass('selected');
                all_btns.removeClass('current');
                all_btns.next('.shape').hide();
            }
            // add selected style to displayed pages' indicator
            $.each(cur_sel, function (i, obj) {
                if (obj.attr('href') == '#'+ui.Slider.current) {
                    obj.next('.shape').show();
                    obj.addClass('current');
                }
                obj.addClass('selected');
                obj.removeClass('unread');
            });
        }
    );    
    $(ui.Main.selected_tweet_id).removeClass('selected'); 
    ui.Main.selected_tweet_id = null;
    $('#tweet_bar').hide();
},

get_page_pos:
function get_page_pos(id) {
    for (var i = 0; i < ui.Slider.tweet_blocks.length; i += 1) {
        if (ui.Slider.tweet_blocks[i] == id) {
            return i;
        }
    }
    return -1;
},

slide_to_prev:
function slide_to_prev() {
    var prev_id = '';
    if (ui.Slider.current == 'home') {
        prev_id = 'search';
    } else {
        var idx = ui.Slider.get_page_pos(ui.Slider.current);
        prev_id = ui.Slider.tweet_blocks[idx - 1];
    }
    ui.Slider.slide_to(prev_id);
},

slide_to_next:
function slide_to_next() {
    var next_id = '';
    if (ui.Slider.current == 'search') {
        next_id = 'home';
    } else {
        var idx = ui.Slider.get_page_pos(ui.Slider.current);
        next_id = ui.Slider.tweet_blocks[idx + 1];
    }
    ui.Slider.slide_to(next_id);
},

set_icon:
function set_icon(name, icon) {
    var btn = $('#indication .indicator_btn[href="#'+name+'"]');
    var span_icon = btn.children('span');
    var img_icon = btn.children('img');
    span_icon.hide();
    img_icon.show();
    img_icon.attr('src', icon);
},

set_unread:
function set_unread(name) {
    var btn = $('#indication .indicator_btn[href="#'+name+'"]');
    if (!btn.hasClass('selected')) {
        btn.addClass('unread');
    }
},

openSliderMenu:
function openSliderMenu() {
    $('#indicator_add_btn').addClass('hlight');
    $('#slider_menu').css({'left': ($('#indicator_add_btn').offset().left)+'px'}).show();
    $('#slider_menu a').each(function (i, n) {
        if (ui.Main.views.hasOwnProperty($(n).attr('href').substring(1))) {
            $(n).addClass('checked');
        } else {
            $(n).removeClass('checked');
        }
    });
    ui.Slider.isSliderMenuClosed = false;
},

closeSliderMenu:
function closeSliderMenu() {
    $('#indicator_add_btn').removeClass('hlight');
    $('#slider_menu').hide();
    ui.Slider.isSliderMenuClosed = true;
},

addDefaultView:
function addDefaultView(name) {
    if (ui.Main.views.hasOwnProperty(name)) {
        return false;
    }
    switch (name) {
    case 'search':
    ui.Slider.add('search'
        , {title: 'Search', icon:'image/ic_search.png'}
        , { 'type':'tweet', 'title': 'Search'
            , 'load': ui.SearchView.load_tweet
            , 'loadmore': ui.SearchView.loadmore_tweet
            , 'load_success': ui.SearchView.load_tweet_success
            , 'load_fail': null
            , 'loadmore_success': ui.SearchView.loadmore_tweet_success
            , 'loadmore_fail': null
            , 'former': ui.Template.form_search
            , 'init': ui.SearchView.init_view
            , 'destroy': ui.SearchView.destroy_view            
            , 'header_html': ui.Template.search_header_t
            , 'method': 'poll'
            , 'interval': -1
            , 'item_type': 'search'
            , 'is_trim': false
        });
    break;
    case 'home':
    ui.Slider.add('home'
        , { title:'Home Timeline', icon:'image/ic_home.png'}
        , { 'type':'tweet', 'title': 'Home Timeline'
            , 'load': ui.Main.load_home
            , 'loadmore': ui.Main.loadmore_home
            , 'load_success': ui.Main.load_tweet_success
            , 'load_fail': null
            , 'loadmore_success': ui.Main.loadmore_tweet_success
            , 'loadmore_fail': null
            , 'former': ui.Template.form_tweet
            , 'destroy': ui.Main.destroy_view            
            , 'method': 'push'
            , 'interval': 60
            , 'item_type': 'id'
        });
    break;
    case 'mentions':
    ui.Slider.add('mentions', {title:'Mentions',icon:'image/ic_mention.png'}
        , { 'type':'tweet', 'title': 'Mentions'
            , 'load': ui.Main.load_mentions
            , 'loadmore': ui.Main.loadmore_mentions
            , 'load_success': ui.Main.load_tweet_success
            , 'load_fail': null
            , 'loadmore_success': ui.Main.loadmore_tweet_success
            , 'loadmore_fail': null
            , 'former': ui.Template.form_tweet
            , 'destroy': ui.Main.destroy_view            
            , 'method': 'push'
            , 'interval': 60
            , 'item_type': 'id'
        });
    break;
    case 'messages':
    ui.Slider.add('messages', {title:'Messages', icon:'image/ic_dm.png'}
        , { 'type':'tweet', 'title': 'Messages'
            , 'load': ui.Main.load_messages
            , 'loadmore': ui.Main.loadmore_messages
            , 'load_success': ui.Main.load_tweet_success
            , 'load_fail': null
            , 'loadmore_success': ui.Main.loadmore_tweet_success
            , 'loadmore_fail': null
            , 'former': ui.Template.form_dm
            , 'destroy': ui.Main.destroy_view            
            , 'method': 'push'
            , 'interval': 120
            , 'item_type': 'id'
        });
    break;
    case 'retweets':
    ui.Slider.add('retweets', {title:'Retweets', icon:'image/ic_retweet.png'}
        , { 'type':'tweet', 'title': 'Retweets'
            , 'load': ui.RetweetView.load_retweeted_to_me 
            , 'loadmore': ui.RetweetView.loadmore_retweeted_to_me
            , 'load_success': ui.Main.load_tweet_success
            , 'load_fail': null
            , 'loadmore_success': ui.Main.loadmore_tweet_success
            , 'loadmore_fail': null
            , 'init': ui.RetweetView.init_view
            , 'destroy': ui.RetweetView.destroy_view            
            , 'header_html': ui.Template.retweets_header_t
            , 'former': ui.Template.form_tweet
            , 'method': 'poll'
            , 'interval': 180
            , 'item_type': 'id'
        });
    break;
    default: break;
    }
    return true;
},

};


