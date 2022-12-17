const taihe = require('./taihe');
const provider = [taihe]
const music = provider[0]

/**
 * 
 * @param {*} searchTxt 搜索内容
 * @param {*} page 分页
 * @param {
 * [{id: 'thtrack_T10044426099',
 * title: '没那么简单',
 * album: '没那么简单',
 * album_id: 'thalbum_P10002088354',
 * source: 'taihe',
 * source_url: 'https://music.taihe.com/song/T10044426099',
 * img_url: 'https://img01.dmhmusic.com/0210/M00/55/C0/ChR47FrxRniASVXUABFODSQ92HI656.jpg',
 * lyric_url: 'https://static-qianqian.taihe.com/0101/M00/10/DE/ChR45V8ief2AInDgAAAJC3B84II029.lrc',
 * artist: '潘裕文',
 * artist_id: 'thartist_A10048505'}]
 * } callback  搜索列表

 */
function search(searchTxt, page, callback) {
    const url = "/search?keywords=" + searchTxt + "&curpage=" + page + "&type=0";
    // todo 搜索
    music.search(url).success(function (data) {
        callback(data.result)
    })
}


/**
 * 
 * @param {
 * id: 'thtrack_T10044426099',
 * title: '没那么简单',
 * album: '没那么简单',
 * album_id: 'thalbum_P10002088354',
 * source: 'taihe',
 * source_url: 'https://music.taihe.com/song/T10044426099',
 * img_url: 'https://img01.dmhmusic.com/0210/M00/55/C0/ChR47FrxRniASVXUABFODSQ92HI656.jpg',
 * lyric_url: 'https://static-qianqian.taihe.com/0101/M00/10/DE/ChR45V8ief2AInDgAAAJC3B84II029.lrc',
 * artist: '潘裕文',
 * artist_id: 'thartist_A10048505'
 * } track
 * @param {  
 * url: 'https://audio04.dmhmusic.com/71_53_T10044426099_128_4_1_0_sdk-cpm/cn/0207/M00/54/DA/ChR47FrxR7eAMDgIAE7VpXfZIfc954.mp3?xcode=9a35c3166d3da012b35893cf12afffe88bbc822',
 * platform: 'taihe',
 * bitrate: '128kbps',
 * lyric: 'https://static-qianqian.taihe.com/0101/M00/10/DE/ChR45V8ief2AInDgAAAJC3B84II029.lrc',
 * pic: 'https://img01.dmhmusic.com/0210/M00/55/C0/ChR47FrxRniASVXUABFODSQ92HI656.jpg'
 * } callback 
 */
function getMusic(track, callback) {
    // todo 获取音频 mp3
    music.bootstrap_track(track, (response) => {
        callback(response)
    }, function () {
        callback(null)
    })
    // todo 获取歌词接口可以不用，getMusic 方法可以直接拿到
    //  const url = "lyric?lyric_url=" + searchTrack.lyric_url
    //  console.log(url)
    //  music.lyric(url).success((lyric) => {
    //      console.log(lyric)
    //  })
}

/**
 * @param {} offset 
 * @param {
 * * [{cover_img_url: 'https://img01.dmhmusic.com/0513/M00/0C/34/ChAKCGOUN1GAfrhPAAbse_zNijI814.jpg',
 * * title: '「天外来物」我们期待已久的演唱会',
 * * id: 'thplaylist_295866',
 * * source_url: 'https://music.taihe.com/songlist/295866'}]
 * } callback 
 */
function getPlayList(offset,callback) {
    // todo 显示推荐歌单
    const list_url = `/playlist?offset=`+offset;
    music.show_playlist(list_url).success((data) => {
        callback(data.result)
        // // todo 获取歌单的歌单曲目，请求返回的是 html，报浏览器版本低，怎么解？
        // const d = data.result[0]
        // const url = `/playlist?list_id=` + d.id;
        // music.get_playlist(url).success((playlist) => {
        //     console.log(playlist)
        // })
    })
}

/**
 * 
 * @param {
 * {
 * cover_img_url: 'https://img01.dmhmusic.com/0513/M00/0C/34/ChAKCGOUN1GAfrhPAAbse_zNijI814.jpg',
 * title: '「天外来物」我们期待已久的演唱会',
 * id: 'thplaylist_295866',
 * source_url: 'https://music.taihe.com/songlist/295866'
 * }
 * } data 
 * 
 * @param {
* [{id: 'thtrack_T10044426099',
* title: '没那么简单',
* album: '没那么简单',
* album_id: 'thalbum_P10002088354',
* source: 'taihe',
* source_url: 'https://music.taihe.com/song/T10044426099',
* img_url: 'https://img01.dmhmusic.com/0210/M00/55/C0/ChR47FrxRniASVXUABFODSQ92HI656.jpg',
* lyric_url: 'https://static-qianqian.taihe.com/0101/M00/10/DE/ChR45V8ief2AInDgAAAJC3B84II029.lrc',
* artist: '潘裕文',
* artist_id: 'thartist_A10048505'}]} callback 
 */
function getPlayMusicList(data, callback) {
    // todo 获取歌单的歌单曲目，请求返回的是 html，报浏览器版本低，怎么解？
    const url = `/playlist?list_id=` + data.id;
    music.get_playlist(url).success((playlist) => {
        callback(playlist.tracks)
    })
}


module.exports.search = search
module.exports.getMusic = getMusic
module.exports.getPlayList = getPlayList
module.exports.getPlayMusicList = getPlayMusicList


// test
// search("没那么简单", 1, function (data) {
//     // console.log(data)
//     // 取第一个音乐的音频信息
//     const track = data[0];
//     getMusic(track, function (data) {
//         console.log(data)
//     })
// })

// getPlayList(1,function (data) {
//     // // 拿到推荐列表
//     const playMusic = data[0]
//     console.log("----------- playMusic ---------------")
//     console.log(playMusic)
//     // 根据推荐列表中的某一个，获取其音乐源列表
//     getPlayMusicList(playMusic, function (list) {
//         console.log("----------- track ---------------")
//         const track = list[0]
//         console.log(track)
//         // 根据音乐源列表中的某一个音乐，获取音乐数据
//         getMusic(track, function (data) {
//             console.log("----------- music ---------------")
//             console.log(data)
//         })
//     })
// })