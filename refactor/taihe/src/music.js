const taihe = require('./taihe');

const provider = [taihe]

const music = provider[0]


function search(searchTxt,callback) {
    const url = "/search?keywords="+searchTxt+"&curpage=1&type=0";

    // todo 搜索，
    music.search(url).success(function (data) {
        // 
        const searchTrack = data.result[0];

        callback(data.result)

        // console.log(searchTrack)
        // console.log(data.result.length)

        // todo 获取音频 mp3
        // music.bootstrap_track(searchTrack, (response) => {
        //     let url = response.url;
        //     let bitrate = response.bitrate;
        //     let platform = response.platform;
        //     let pic = response.pic;
        //     let lyric = response.lyric;
        //     // console.log("url--->" + url)
        //     // console.log("bitrate--->" + bitrate)
        //     // console.log("platform--->" + platform)
        //     // console.log("pic--->" + pic)
        //     // console.log("lyric--->" + lyric)
        //     // reject(sound); // Use Reject to return immediately
        // }, function () {
        //     console.log("error--->")
        // })

         // todo 获取歌词，可以不用
        //  const url = "lyric?lyric_url=" + searchTrack.lyric_url
        //  console.log(url)
        //  music.lyric(url).success((lyric) => {
        //      console.log(lyric)
        //  })
         

        // todo 显示推荐歌单
        // const list_url = `/playlist?offset=1`;
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


module.exports.search = search

// search("没那么简单",function(data){
//     console.log(data)
// })