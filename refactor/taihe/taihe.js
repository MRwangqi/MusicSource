/* eslint-disable no-unused-vars */
/* global async getParameterByName forge */

const axios = require('axios')//require('../vendor/axios.min.js');
const async = require('async');
const forge = require('node-forge');


function getRequestParams(p) {
  const params = { ...p };
  params.timestamp = Math.round(Date.now() / 1000);
  params.appid = '16073360';
  const q = new URLSearchParams(params);
  q.sort();
  const signStr = decodeURIComponent(
    `${q.toString()}0b50b02fd0d73a9c4c8c3a781c30845f`
  );
  params.sign = forge.md5
    .create()
    .update(forge.util.encodeUtf8(signStr))
    .digest()
    .toHex();

  return params
}


function th_convert_song(song) {
  const track = {
    id: `thtrack_${song.id}`,
    title: song.title,
    album: song.albumTitle,
    album_id: `thalbum_${song.albumAssetCode}`,
    source: 'taihe',
    source_url: `https://music.taihe.com/song/${song.id}`,
    img_url: song.pic,
    lyric_url: song.lyric || '',
  };
  if (song.artist && song.artist.length) {
    track.artist = song.artist[0].name;
    track.artist_id = `thartist_${song.artist[0].artistCode}`;
  }
  return track;
}

function th_render_tracks(url, page, callback) {
  const list_id = getParameterByName('list_id', url).split('_').pop();
  axios
    .get('https://music.taihe.com/v1/tracklist/info', {
      params: getRequestParams({
        id: list_id,
        pageNo: page,
        pageSize: 100,
      }),
    })
    .then((response) => {
      const data = response.data.data.trackList;
      const tracks = data.map(th_convert_song);
      return callback(null, tracks);
    });
}

function search(url) {
  const keyword = getParameterByName('keywords', url);
  const curpage = getParameterByName('curpage', url);
  const searchType = getParameterByName('type', url);
  if (searchType === '1') {
    return {
      success: (fn) =>
        fn({
          result: [],
          total: 0,
          type: searchType,
        }),
    };
  }
  return {
    success: (fn) => {
      axios.get('https://music.taihe.com/v1/search', {
        params: getRequestParams({
          word: keyword,
          pageNo: curpage || 1,
          type: 1,
        }),
      })
        .then((res) => {
          const { data } = res;
          const tracks = data.data.typeTrack.map(th_convert_song);
          return fn({
            result: tracks,
            total: data.data.total,
            type: searchType,
          });
        })
        .catch((e) => {
          console.log(e)
          fn({
            result: [],
            total: 0,
            type: searchType,
          })
        }
        );
    },
  };
}

function th_get_playlist(url) {
  const list_id = getParameterByName('list_id', url).split('_').pop();

  return {
    success: (fn) => {
      axios
        .get('https://music.taihe.com/v1/tracklist/info', {
          params: getRequestParams({
            id: list_id,
          }),
        })
        .then((response) => {
          const { data } = response.data;

          const info = {
            cover_img_url: data.pic,
            title: data.title,
            id: `thplaylist_${list_id}`,
            source_url: `https://music.taihe.com/songlist/${list_id}`,
          };

          const total = data.trackCount;
          const page = Math.ceil(total / 100);
          const page_array = Array.from({ length: page }, (v, k) => k + 1);
          async.concat(
            page_array,
            (item, callback) => th_render_tracks(url, item, callback),
            (err, tracks) => {
              fn({
                tracks,
                info,
              });
            }
          );
        });
    },
  };
}

function th_artist(url) {
  return {
    success: (fn) => {
      const artist_id = getParameterByName('list_id', url).split('_').pop();
      axios
        .get('https://music.taihe.com/v1/artist/info', {
          params: getRequestParams({
            artistCode: artist_id,
          }),
        })
        .then((response) => {
          const info = {
            cover_img_url: response.data.data.pic,
            title: response.data.data.name,
            id: `thartist_${artist_id}`,
            source_url: `https://music.taihe.com/artist/${artist_id}`,
          };
          axios
            .get('https://music.taihe.com/v1/artist/song', {
              params: getRequestParams({
                artistCode: artist_id,
                pageNo: 1,
                pageSize: 50,
              }),
            })
            .then((res) => {
              const tracks = res.data.data.result.map(th_convert_song);
              return fn({
                tracks,
                info,
              });
            });
        });
    },
  };
}

function bootstrap_track(track, success, failure) {
  const sound = {};
  const song_id = track.id.slice('thtrack_'.length);

  axios
    .get('https://music.taihe.com/v1/song/tracklink', {
      params: getRequestParams({
        TSID: song_id,
      }),
    })
    .then((response) => {
      const { data } = response;
      if (data.data && data.data.path) {
        sound.url = data.data.path;
        sound.platform = 'taihe';
        sound.bitrate = `${data.data.rate}kbps`;
        sound.lyric = data.data.lyric
        sound.pic = data.data.pic
        success(sound);
      } else if (data.data && data.data.trail_audio_info.path) {
        sound.url = data.data.trail_audio_info.path;
        sound.platform = 'taihe';
        sound.bitrate = `${data.data.trail_audio_info.rate}kbps`;
        sound.lyric = data.data.lyric
        sound.pic = data.data.pic
        success(sound);
      }
      else {
        failure(sound);
      }
    });
}

function lyric(url) {
  // eslint-disable-line no-unused-vars
  const lyric_url = getParameterByName('lyric_url', url);

  return {
    success: (fn) => {
      if (lyric_url) {
        axios.get(lyric_url).then((response) =>
          fn({
            lyric: response.data,
          })
        );
      } else {
        const track_id = getParameterByName('track_id', url).split('_').pop();
        axios
          .get('https://music.taihe.com/v1/song/tracklink', {
            params: getRequestParams({
              TSID: track_id,
            }),
          })
          .then((response) => {
            axios.get(response.data.data.lyric).then((res) =>
              fn({
                lyric: res.data,
              })
            );
          });
      }
    },
  };
}

function th_album(url) {
  return {
    success: (fn) => {
      const album_id = getParameterByName('list_id', url).split('_').pop();

      axios
        .get('https://music.taihe.com/v1/album/info', {
          params: getRequestParams({
            albumAssetCode: album_id,
          }),
        })
        .then((response) => {
          const { data } = response.data;
          const info = {
            cover_img_url: data.pic,
            title: data.title,
            id: `thalbum_${album_id}`,
            source_url: `https://music.taihe.com/album/${album_id}`,
          };

          const tracks = data.trackList.map((song) => ({
            id: `thtrack_${song.assetId}`,
            title: song.title,
            artist: song.artist ? song.artist[0].name : '',
            artist_id: song.artist
              ? `thartist_${song.artist[0].artistCode}`
              : 'thartist_',
            album: info.title,
            album_id: `thalbum_${album_id}`,
            source: 'taihe',
            source_url: `https://music.taihe.com/song/${song.assetId}`,
            img_url: info.cover_img_url,
            lyric_url: '',
          }));
          return fn({
            tracks,
            info,
          });
        });
    },
  };
}

function show_playlist(url) {
  const offset = Number(getParameterByName('offset', url));
  // const subCate = getParameterByName('filter_id', url);
  return {
    success: (fn) => {
      axios
        .get('https://music.taihe.com/v1/tracklist/list', {
          params: getRequestParams({
            pageNo: offset / 25 + 1,
            pageSize: 25,
            // subCateId: subCate,
          }),
        })
        .then((response) => {
          const { data } = response.data;
          const result = data.result.map((item) => ({
            cover_img_url: item.pic,
            title: item.title,
            id: `thplaylist_${item.id}`,
            source_url: `https://music.taihe.com/songlist/${item.id}`,
          }));
          return fn({
            result,
          });
        });
    },
  };
}

function parse_url(url) {
  let result;
  let id = '';
  let match = /\/\/music.taihe.com\/([a-z]+)\//.exec(url);
  if (match) {
    switch (match[1]) {
      case 'songlist':
        match = /\/\/music.taihe.com\/songlist\/([0-9]+)/.exec(url);
        id = match ? `thplaylist_${match[1]}` : '';
        break;
      case 'artist':
        match = /\/\/music.taihe.com\/artist\/(A[0-9]+)/.exec(url);
        id = match ? `thartist_${match[1]}` : '';
        break;
      case 'album':
        match = /\/\/music.taihe.com\/album\/(P[0-9]+)/.exec(url);
        id = match ? `thalbum_${match[1]}` : '';
        break;
      default:
        break;
    }
    result = {
      type: 'playlist',
      id,
    };
  }
  return {
    success: (fn) => {
      fn(result);
    },
  };
}

function get_playlist(url) {
  const list_id = getParameterByName('list_id', url).split('_')[0];
  switch (list_id) {
    case 'thplaylist':
      return th_get_playlist(url);
    case 'thalbum':
      return th_album(url);
    case 'thartist':
      return th_artist(url);
    default:
      return null;
  }
}

function get_playlist_filters() {
  return {
    success: (fn) => {
      axios.get('https://music.taihe.com/v1/tracklist/category').then((res) =>
        fn({
          recommend: [{ id: '', name: '推荐歌单' }],
          all: res.data.data.map((sub) => ({
            category: sub.categoryName,
            filters: sub.subCate.map((i) => ({
              id: i.id,
              name: i.categoryName,
            })),
          })),
        })
      );
    },
  };
}

function get_user() {
  return {
    success: (fn) => {
      fn({ status: 'fail', data: {} });
    },
  };
}

function get_login_url() {
  return `https://music.taihe.com`;
}

function logout() { }

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&'); // eslint-disable-line no-useless-escape
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`);

  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

module.exports.search = search;
module.exports.bootstrap_track = bootstrap_track;
module.exports.get_playlist = get_playlist
module.exports.getParameterByName = getParameterByName
module.exports.lyric = lyric
module.exports.show_playlist = show_playlist