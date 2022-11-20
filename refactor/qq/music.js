const qq = require('./qq');

const provider = [qq]

const music = provider[0]


function search() {
    const url = `/search?keywords=一直想问你&curpage=1&type=0`;

    // todo 搜索
    music.search(url).success(function (data) {
        // 
        const searchTrack = data.result[0];

        console.log(searchTrack)
        // console.log(data.result.length)

        // todo 获取音频 mp3，用户校验失败，无法获取到
        music.bootstrap_track(searchTrack, (response) => {
            let url = response.url;
            let bitrate = response.bitrate;
            let platform = response.platform;
            console.log("url--->" + url)
            console.log("bitrate--->" + bitrate)
            console.log("platform--->" + platform)
        }, function (e) {
            console.log(e.data.req_0.data.midurlinfo)
        })

       

        // todo 获取歌词 
        const lyric_url = "lyric?track_id="+searchTrack.id;
        console.log(lyric_url)
        music.lyric(lyric_url).success((lyric) => {
            console.log(lyric)
        })


        // todo 显示推荐歌单
        const url = `/playlist?offset=0`;
        music.show_playlist(url).success((data) => {
            // console.log(data.result)

            // todo 获取歌单的歌单曲目，请求返回的是 html，报浏览器版本低，怎么解？
            const d = data.result[0]
            const url = `/playlist?list_id=`+d.id;
            music.get_playlist(url).success((playlist) => {
                // console.log(playlist)
            })
        })
    })
}


search()