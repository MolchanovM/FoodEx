services = {

    "www.zolotoruno.net": {
        cartAddress: "http://www.zolotoruno.net/cart",
        linkHandler: function() {
            this.process = function(link) {
                $.get(link, function(data) {
                    id = /link(?:\s+)rel=\"shortlink\"(?:\s+)href=\"\/node\/([0-9]+)\"/.exec(data)[1];
                    $.get("http://www.zolotoruno.net/cart/add/" + id);
                });
            };
        }
    },

    "pizza-kvartal.com": {
        cartAddress: "http://pizza-kvartal.com/menu/menulist.php?view=cart",
        linkHandler: function() {
            this.map = [];
            this.process = function(link) {
                var id = /([0-9]+)/.exec(link)[1];
                if (!(id in this.map)) {
                    this.map[id] = 0;
                    $.post("http://pizza-kvartal.com/menu/menulist.php", { "act": "plus_one", "dish_id": id, "price": "price1"});
                } else {
                    $.post("http://pizza-kvartal.com/menu/menulist.php", { "act": "plus", "dish_id": id});
                }
                ++this.map[id];
            };
        }
    }

}