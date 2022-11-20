const netease = require('./netease');

const provider = [netease]

const music = provider[0]


function search() {
    const url = `/search?keywords=不能说的秘密&curpage=1&type=0`;

    // todo 搜索，酷我需要本地的 cookie 有 token 才行
    music.search(url).success(function (data) {
        // 
        const searchTrack = data.result[0];
        console.log(searchTrack)

        // console.log(data.result.length)

        // todo 获取音频 mp3
        music.bootstrap_track(searchTrack, (response) => {
            let url = response.url;
            let bitrate = response.bitrate;
            let platform = response.platform;
            console.log("url--->" + url)
            console.log("bitrate--->" + bitrate)
            console.log("platform--->" + platform)
            // reject(sound); // Use Reject to return immediately
        }, function () {
            console.log("error--->")
        })


        // todo 获取歌词 ：获取歌词有点问题，拿到的是空，应该是 cookie 问题
        const url = "lyric?track_id=" + searchTrack.id
        console.log(url)
        music.lyric(url).success((lyric) => {
            console.log(lyric)
        })


        // todo 显示推荐歌单：解析 html dom 有问题
        // const list_url = `/playlist?offset=0`;
        // music.show_playlist(list_url).success((data) => {
        //     console.log(data.result[0])

        //     // todo 获取歌单的歌单曲目，请求返回的是 html，报浏览器版本低，怎么解？
        //     const d = data.result[0]
        //     const url = `/playlist?list_id=` + d.id;
        //     music.get_playlist(url).success((playlist) => {
        //         console.log(playlist)
        //     })
        // })
    })
}


search()