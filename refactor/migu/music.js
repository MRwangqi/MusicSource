const migu = require('./migu');

const provider = [migu]

const music = provider[0]


function search() {
    const url = `/search?keywords=不能说的秘密&curpage=1&type=0`;

    // todo 搜索
    music.search(url).success(function (data) {
        // 
        const searchTrack = data.result[0];

        console.log(searchTrack)
        // console.log(data.result.length)

        // todo 获取音频 mp3，用户校验失败，无法获取到
        music.bootstrap_track(searchTrack, (response) => {
            let url = response;
            console.log("url--->" + url)
        }, function () {
            console.log("error--->")
        })

        // todo 获取专辑，可以拿到 icon 等信息
        // const url = `/playlist?list_id=kgalbum_36448370`;
        // music.get_playlist(url).success((playlist) => {
        //     console.log(playlist)
        // })
        // const url = `/playlist?list_id=kgartist_1105784`;
        // music.get_playlist(url).success((playlist) => {
        //     console.log(playlist)
        // })

        // todo 获取歌词 
        // const url = "lyric?track_id="+searchTrack.lyric_url+"&album_id="+searchTrack.album_id;
        // console.log(url)
        // music.lyric(url).success((lyric) => {
        //     console.log(lyric)
        // })


        // todo 显示推荐歌单
        // const url = `/playlist?offset=0`;
        // music.show_playlist(url).success((data) => {
        //     // console.log(data.result)

        //     // todo 获取歌单的歌单曲目，请求返回的是 html，报浏览器版本低，怎么解？
        //     const d = data.result[0]
        //     const url = `/playlist?list_id=`+d.id;
        //     music.get_playlist(url).success((playlist) => {
        //         console.log(playlist)
        //     })
        // })
    })
}


search()