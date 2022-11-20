/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-vars */
/* global getParameterByName forge */
/* global isElectron cookieSet cookieGet cookieRemove async */
const axios = require('axios')
const async = require('async');
const forge = require('node-forge');

const { DOMParser } = require('@xmldom/xmldom')

const btoa = function (str) { return Buffer.from(str).toString('base64'); }

function _create_secret_key(size) {
  const result = [];
  const choice = '012345679abcdef'.split('');
  for (let i = 0; i < size; i += 1) {
    const index = Math.floor(Math.random() * choice.length);
    result.push(choice[index]);
  }
  return result.join('');
}

function _aes_encrypt(text, sec_key, algo) {
  const cipher = forge.cipher.createCipher(algo, sec_key);
  cipher.start({ iv: '0102030405060708' });
  cipher.update(forge.util.createBuffer(text));
  cipher.finish();

  return cipher.output;
}

function _rsa_encrypt(text, pubKey, modulus) {
  text = text.split('').reverse().join(''); // eslint-disable-line no-param-reassign
  const n = new forge.jsbn.BigInteger(modulus, 16);
  const e = new forge.jsbn.BigInteger(pubKey, 16);
  const b = new forge.jsbn.BigInteger(forge.util.bytesToHex(text), 16);
  const enc = b.modPow(e, n).toString(16).padStart(256, '0');
  return enc;
}

function weapi(text) {
  const modulus =
    '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b72' +
    '5152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbd' +
    'a92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe48' +
    '75d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
  const nonce = '0CoJUm6Qyw8W8jud';
  const pubKey = '010001';
  text = JSON.stringify(text); // eslint-disable-line no-param-reassign
  const sec_key = _create_secret_key(16);
  const enc_text = btoa(
    _aes_encrypt(
      btoa(_aes_encrypt(text, nonce, 'AES-CBC').data),
      sec_key,
      'AES-CBC'
    ).data
  );
  const enc_sec_key = _rsa_encrypt(sec_key, pubKey, modulus);
  const data = {
    params: enc_text,
    encSecKey: enc_sec_key,
  };

  return data;
}

// refer to https://github.com/Binaryify/NeteaseCloudMusicApi/blob/master/util/crypto.js
function eapi(url, object) {
  const eapiKey = 'e82ckenh8dichen8';

  const text = typeof object === 'object' ? JSON.stringify(object) : object;
  const message = `nobody${url}use${text}md5forencrypt`;
  const digest = forge.md5
    .create()
    .update(forge.util.encodeUtf8(message))
    .digest()
    .toHex();
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;

  return {
    params: _aes_encrypt(data, eapiKey, 'AES-ECB').toHex().toUpperCase(),
  };
}

function ne_show_toplist(offset) {
  if (offset !== undefined && offset > 0) {
    return {
      success: (fn) => fn({ result: [] }),
    };
  }
  const url = 'https://music.163.com/weapi/toplist/detail';
  const data = weapi({});
  return {
    success: (fn) => {
      axios.post(url, new URLSearchParams(data)).then((response) => {
        const result = [];
        response.data.list.forEach((item) => {
          const playlist = {
            cover_img_url: item.coverImgUrl,
            id: `neplaylist_${item.id}`,
            source_url: `https://music.163.com/#/playlist?id=${item.id}`,
            title: item.name,
          };
          result.push(playlist);
        });
        return fn({ result });
      });
    },
  };
}

function show_playlist(url) {
  const order = 'hot';
  const offset = getParameterByName('offset', url);
  const filterId = getParameterByName('filter_id', url);

  if (filterId === 'toplist') {
    return ne_show_toplist(offset);
  }

  let filter = '';
  if (filterId !== '') {
    filter = `&cat=${filterId}`;
  }
  let target_url = '';
  if (offset != null) {
    target_url = `https://music.163.com/discover/playlist/?order=${order}${filter}&limit=35&offset=${offset}`;
  } else {
    target_url = `https://music.163.com/discover/playlist/?order=${order}${filter}`;
  }

  return {
    success: (fn) => {
      axios.get(target_url).then((response) => {
        const { data } = response;

        console.log(target_url)
        console.log(data)
        const list_elements = Array.from(
          new DOMParser()
            .parseFromString(data, 'text/html')
            .getElementsByClassName('m-cvrlst')[0].children
        );
        const result = list_elements.map((item) => ({
          cover_img_url: item
            .getElementsByTagName('img')[0]
            .src.replace('140y140', '512y512'),

          title: item
            .getElementsByTagName('div')[0]
            .getElementsByTagName('a')[0].title,
          id: `neplaylist_${getParameterByName(
            'id',
            item.getElementsByTagName('div')[0].getElementsByTagName('a')[0]
              .href
          )}`,
          source_url: `https://music.163.com/#/playlist?id=${getParameterByName(
            'id',
            item.getElementsByTagName('div')[0].getElementsByTagName('a')[0]
              .href
          )}`,
        }));
        return fn({
          result,
        });
      });
    },
  };
}

function ne_ensure_cookie(callback) {
  const domain = 'https://music.163.com';
  const nuidName = '_ntes_nuid';
  const nnidName = '_ntes_nnid';

  cookieGet(
    {
      url: domain,
      name: nuidName,
    },
    (cookie) => {
      if (cookie == null) {
        const nuidValue = _create_secret_key(32);
        const nnidValue = `${nuidValue},${new Date().getTime()}`;
        // netease default cookie expire time: 100 years
        const expire =
          (new Date().getTime() + 1e3 * 60 * 60 * 24 * 365 * 100) / 1000;

        cookieSet(
          {
            url: domain,
            name: nuidName,
            value: nuidValue,
            expirationDate: expire,
          },
          () => {
            cookieSet(
              {
                url: domain,
                name: nnidName,
                value: nnidValue,
                expirationDate: expire,
              },
              () => {
                callback(null);
              }
            );
          }
        );
      } else {
        callback(null);
      }
    }
  );
}

function async_process_list(
  data_list,
  handler,
  handler_extra_param_list,
  callback
) {
  const fnDict = {};
  data_list.forEach((item, index) => {
    fnDict[index] = (cb) =>
      handler(index, item, handler_extra_param_list, cb);
  });
  async.parallel(fnDict, (err, results) =>
    callback(
      null,
      data_list.map((item, index) => results[index])
    )
  );
}

function ng_render_playlist_result_item(index, item, callback) {
  const target_url = 'https://music.163.com/weapi/v3/song/detail';
  const queryIds = [item.id];
  const d = {
    c: `[${queryIds.map((id) => `{"id":${id}}`).join(',')}]`,
    ids: `[${queryIds.join(',')}]`,
  };
  const data = weapi(d);
  axios
    .post(target_url, new URLSearchParams(data).toString())
    .then((response) => {
      const track_json = response.data.songs[0];
      const track = {
        id: `netrack_${track_json.id}`,
        title: track_json.name,
        artist: track_json.ar[0].name,
        artist_id: `neartist_${track_json.ar[0].id}`,
        album: track_json.al.name,
        album_id: `nealbum_${track_json.al.id}`,
        source: 'netease',
        source_url: `https://music.163.com/#/song?id=${track_json.id}`,
        img_url: track_json.al.picUrl,
        // url: `netrack_${track_json.id}`,
      };
      return callback(null, track);
    });
}

function ng_parse_playlist_tracks(playlist_tracks, callback) {
  const target_url = 'https://music.163.com/weapi/v3/song/detail';
  const track_ids = playlist_tracks.map((i) => i.id);
  const d = {
    c: `[${track_ids.map((id) => `{"id":${id}}`).join(',')}]`,
    ids: `[${track_ids.join(',')}]`,
  };
  const data = weapi(d);
  axios.post(target_url, new URLSearchParams(data)).then((response) => {
    const tracks = response.data.songs.map((track_json) => ({
      id: `netrack_${track_json.id}`,
      title: track_json.name,
      artist: track_json.ar[0].name,
      artist_id: `neartist_${track_json.ar[0].id}`,
      album: track_json.al.name,
      album_id: `nealbum_${track_json.al.id}`,
      source: 'netease',
      source_url: `https://music.163.com/#/song?id=${track_json.id}`,
      img_url: track_json.al.picUrl,
      // url: `netrack_${track_json.id}`,
    }));

    return callback(null, tracks);
  });
}

function split_array(myarray, size) {
  const count = Math.ceil(myarray.length / size);
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push(myarray.slice(i * size, (i + 1) * size));
  }
  return result;
}

function ne_get_playlist(url) {
  // special thanks for @Binaryify
  // https://github.com/Binaryify/NeteaseCloudMusicApi
  return {
    success: (fn) => {
      const list_id = getParameterByName('list_id', url).split('_').pop();
      const target_url = 'https://music.163.com/weapi/v3/playlist/detail';
      const d = {
        id: list_id,
        offset: 0,
        total: true,
        limit: 1000,
        n: 1000,
        csrf_token: '',
      };
      const data = weapi(d);
      ne_ensure_cookie(() => {
        axios.post(target_url, new URLSearchParams(data)).then((response) => {
          const { data: res_data } = response;
          const info = {
            id: `neplaylist_${list_id}`,
            cover_img_url: res_data.playlist.coverImgUrl,
            title: res_data.playlist.name,
            source_url: `https://music.163.com/#/playlist?id=${list_id}`,
          };
          const max_allow_size = 1000;
          const trackIdsArray = split_array(
            res_data.playlist.trackIds,
            max_allow_size
          );

          function ng_parse_playlist_tracks_wrapper(trackIds, callback) {
            return netease.ng_parse_playlist_tracks(trackIds, callback);
          }

          async.concat(
            trackIdsArray,
            ng_parse_playlist_tracks_wrapper,
            (err, tracks) => {
              fn({ tracks, info });
            }
          );

          // request every tracks to fetch song info
          // async_process_list(res_data.playlist.trackIds, ng_render_playlist_result_item,
          //   (err, tracks) => fn({
          //     tracks,
          //     info,
          //   }));
        });
      });
    },
  };
}

function bootstrap_track(track, success, failure) {
  const sound = {};
  const target_url = `https://interface3.music.163.com/eapi/song/enhance/player/url`;
  let song_id = track.id;
  const eapiUrl = '/api/song/enhance/player/url';

  song_id = song_id.slice('netrack_'.length);

  const d = {
    ids: `[${song_id}]`,
    br: 999000,
  };
  const data = eapi(eapiUrl, d);
  const expire =
    (new Date().getTime() + 1e3 * 60 * 60 * 24 * 365 * 100) / 1000;

  // cookieSet(
  //   {
  //     url: 'https://interface3.music.163.com',
  //     name: 'os',
  //     value: 'pc',
  //     expirationDate: expire,
  //   },
  //   (cookie) => {
  axios.post(target_url, new URLSearchParams(data), getHeader()).then((response) => {
    const { data: res_data } = response;
    const { url, br } = res_data.data[0];
    if (url != null) {
      sound.url = url;
      const bitrate = `${(br / 1000).toFixed(0)}kbps`;
      sound.bitrate = bitrate;
      sound.platform = 'netease';

      success(sound);
    } else {
      failure(sound);
    }
  });
  // }
  // );
}

function is_playable(song) {
  return song.fee !== 4 && song.fee !== 1;
}

/**
 * 
 * @returns 写死的 cookie，可以通过 listnen1 的 request 获取
 */
function getHeader() {
  return {
    headers: {
      "origin": "https://music.163.com/",
      "referer": "https://music.163.com/",
      "cookie": "vjuids=8c094f7c7.16446ce2e93.0.5377a359c8b72; mail_psc_fingerprint=30fc011f054020eca651aa085fa2aa41; nts_mail_user=lontano94@163.com:-1:1; vjlast=1530196275.1534825236.23; _ntes_nuid=201db590fe2313f5667d70ca3ed88536; _ga=GA1.2.1327571050.1637238405; mp_MA-91DF-2127272A00D5_hubble=%7B%22sessionReferrer%22%3A%20%22https%3A%2F%2Fsq.sf.163.com%2Fblog%2Farticle%2F172488654567956480%22%2C%22updatedTime%22%3A%201637479254889%2C%22sessionStartTime%22%3A%201637479254877%2C%22deviceUdid%22%3A%20%227f50d299-400a-4222-8ad6-b627f0d3af9d%22%2C%22initial_referrer%22%3A%20%22%24direct%22%2C%22initial_referring_domain%22%3A%20%22%24direct%22%2C%22persistedTime%22%3A%201637238403939%2C%22LASTEVENT%22%3A%20%7B%22eventId%22%3A%20%22da_screen%22%2C%22time%22%3A%201637479254890%7D%2C%22sessionUuid%22%3A%20%227b935c1b-ce06-454e-a2f2-2783eb388062%22%7D; vinfo_n_f_l_n3=5c565aecce348d6a.1.0.1648992459645.0.1648992531206; NTES_P_UTID=cGl8gG121rj0uCfUeJG0aWJOERe4wKEm|1665322370; NTES_SESS=mKs3f_7KeNZyRPw3KkHpisohvRHLj9w9zVB6Noh.cJxIRcNfRVhy3uVioubYEDmA4jeT0hzO9or8WKXTgr1jTAeAPiN5Pu54TLVeRO6ETOG0rj36gdtgnKmb95BbrGKSpNhK.9OP4DRo25fofSHwxG8btZy9e8cBkTj9Jv4OOa08fAuZ4SoTb7enmMcCpPsB7GO18qKq8MkFu; S_INFO=1665322370|0|3&80##|lontano94; P_INFO=lontano94@163.com|1665322370|1|mail163|00&99|null&null&null#zhj&330100#10#0#0|&0||lontano94@163.com; MUSIC_EMAIL_U=6e5c961833dc4481cc1b46dc91bcd64e90737e9479fc7775d3f8951eb93096ff8f0f494ecede5cf7add2bc8204eeee5ebf17d410b71c64300a3b7e20df521f51d32a37e56e621bc799263a30ed13a663d427f2c8160bfdad; JSESSIONID-WYYY=uQ5l6kXoWs1abvtsogr2%2FDgXYFTr79cjPlEehC1V%2FkprTxvIxKaOKZvxpOiNaSAMHoAYcyroRWR6OGVfiT%2B5Gydny2CobWF%2BCIIaAyWHDyvTOx%5CbJ%5CzMDRmO%2B2Cf6Xdvic%5CBJDyna8%5CBTyj3uZFK43wdcPY0m0zBRMQFpK%5C%2BEOtJrk3t%3A1665324175675; _iuqxldmzr_=32; _ntes_nnid=201db590fe2313f5667d70ca3ed88536,1665322375701; playliststatus=visible; WEVNSM=1.0.0; WNMCID=hnsurq.1665322376574.01.0; WM_TID=Bzvt37D4HGtFREFVBFJpyZyghBIe1nmg; WM_NI=Q1CIlSiBlXqlBwflUyLSxN0nn70ZNmyrBYtZw80LvYcmcAM39ZqSjP3OoVTOeL3sYfB0gpu6UruJHQBt9TATrD5xUv6nzPrRh%2FeNmm8Yh01%2FkTtTMj36zedNQQNZi%2BPmSDk%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eed6ea3a8a9ea2bae74294ef8aa2d54f929a8a86d454fbaea9d0e662baf500afdb2af0fea7c3b92a93ef8daaef59ab9ea4b9f46882a9aa8dd873908db8afb366aee900bbcd67bbae8ebaf752b5e800adf553a1b3ada2d039fb86bfb4e95cf191a1b7d745a794fd94dc6e82f0a991f83e97aebbabcb5b82acf7b5c460b29cfb99d87ef6b2b6b1f15aacf1abaff067fc87a8d1b425a98cbcb5d062f1eab686e746938f82bbec2194b39da5ea37e2a3; NMTID=00O1d4CeSXXSr1ObEWvugyin1cXSuwAAAGD2l6u-Q"
    }
  }
}
function search(url) {
  // use chrome extension to modify referer.
  const target_url = 'https://music.163.com/api/search/pc';
  const keyword = getParameterByName('keywords', url);
  const curpage = getParameterByName('curpage', url);
  const searchType = getParameterByName('type', url);
  let ne_search_type = '1';
  if (searchType === '1') {
    ne_search_type = '1000';
  }
  const req_data = {
    s: keyword,
    offset: 20 * (curpage - 1),
    limit: 20,
    type: ne_search_type,
  };
  return {
    success: (fn) => {
      axios
        .post(target_url, new URLSearchParams(req_data), getHeader())
        .then((response) => {
          const { data } = response;
          console.log(data)
          let result = [];
          let total = 0;
          if (searchType === '0') {
            result = data.result.songs.map((song_info) => ({
              id: `netrack_${song_info.id}`,
              title: song_info.name,
              artist: song_info.artists[0].name,
              artist_id: `neartist_${song_info.artists[0].id}`,
              album: song_info.album.name,
              album_id: `nealbum_${song_info.album.id}`,
              source: 'netease',
              source_url: `https://music.163.com/#/song?id=${song_info.id}`,
              img_url: song_info.album.picUrl,
              // url: `netrack_${song_info.id}`,
              url: !is_playable(song_info) ? '' : undefined,
            }));
            total = data.result.songCount;
          } else if (searchType === '1') {
            result = data.result.playlists.map((info) => ({
              id: `neplaylist_${info.id}`,
              title: info.name,
              source: 'netease',
              source_url: `https://music.163.com/#/playlist?id=${info.id}`,
              img_url: info.coverImgUrl,
              url: `neplaylist_${info.id}`,
              author: info.creator.nickname,
              count: info.trackCount,
            }));
            total = data.result.playlistCount;
          }

          return fn({
            result,
            total,
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
        });
    },
  };
}

function ne_album(url) {
  const album_id = getParameterByName('list_id', url).split('_').pop();
  // use chrome extension to modify referer.
  const target_url = `https://music.163.com/api/album/${album_id}`;

  return {
    success: (fn) => {
      axios.get(target_url).then((response) => {

        const { data } = response;
        const info = {
          cover_img_url: data.album.picUrl,
          title: data.album.name,
          id: `nealbum_${data.album.id}`,
          source_url: `https://music.163.com/#/album?id=${data.album.id}`,
        };

        const tracks = data.album.songs.map((song_info) => ({
          id: `netrack_${song_info.id}`,
          title: song_info.name,
          artist: song_info.artists[0].name,
          artist_id: `neartist_${song_info.artists[0].id}`,
          album: song_info.album.name,
          album_id: `nealbum_${song_info.album.id}`,
          source: 'netease',
          source_url: `https://music.163.com/#/song?id=${song_info.id}`,
          img_url: song_info.album.picUrl,
          url: !is_playable(song_info) ? '' : undefined,
        }));
        return fn({
          tracks,
          info,
        });
      });
    },
  };
}

function ne_artist(url) {
  const artist_id = getParameterByName('list_id', url).split('_').pop();
  // use chrome extension to modify referer.
  const target_url = `https://music.163.com/api/artist/${artist_id}`;

  return {
    success: (fn) => {
      axios.get(target_url).then((response) => {
        const { data } = response;
        const info = {
          cover_img_url: data.artist.picUrl,
          title: data.artist.name,
          id: `neartist_${data.artist.id}`,
          source_url: `https://music.163.com/#/artist?id=${data.artist.id}`,
        };

        const tracks = data.hotSongs.map((song_info) => ({
          id: `netrack_${song_info.id}`,
          title: song_info.name,
          artist: song_info.artists[0].name,
          artist_id: `neartist_${song_info.artists[0].id}`,
          album: song_info.album.name,
          album_id: `nealbum_${song_info.album.id}`,
          source: 'netease',
          source_url: `https://music.163.com/#/song?id=${song_info.id}`,
          img_url: song_info.album.picUrl,
          // url: `netrack_${song_info.id}`,
          url: !is_playable(song_info) ? '' : undefined,
        }));
        return fn({
          tracks,
          info,
        });
      });
    },
  };
}


function getCookieHeader() {
  return {
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "referer": "https://music.163.com/",
      "cookie": ""
    }
  }
}

function lyric(url) {
  const track_id = getParameterByName('track_id', url).split('_').pop();
  // use chrome extension to modify referer.
  const target_url = 'https://music.163.com/weapi/song/lyric?csrf_token=';
  const csrf = '';
  const d = {
    id: track_id,
    lv: -1,
    tv: -1,
    csrf_token: csrf,
  };
  const data = weapi(d);
  return {
    success: (fn) => {
      console.log(target_url)
      axios.post(target_url, new URLSearchParams(data), getCookieHeader()).then((response) => {
        const { data: res_data } = response;
        let lrc = '';
        let tlrc = '';
        if (res_data.lrc != null) {
          lrc = res_data.lrc.lyric;
        }
        if (res_data.tlyric != null && res_data.tlyric.lyric != null) {
          // eslint-disable-next-line no-control-regex
          tlrc = res_data.tlyric.lyric.replace(/(|\\)/g, '');
          tlrc = tlrc.replace(/[\u2005]+/g, ' ');
        }
        return fn({
          lyric: lrc,
          tlyric: tlrc,
        });
      });
    },
  };
}

function parse_url(url) {
  let result;
  let id = '';
  // eslint-disable-next-line no-param-reassign
  url = url.replace(
    'music.163.com/#/discover/toplist?',
    'music.163.com/#/playlist?'
  ); // eslint-disable-line no-param-reassign
  url = url.replace('music.163.com/#/my/m/music/', 'music.163.com/'); // eslint-disable-line no-param-reassign
  url = url.replace('music.163.com/#/m/', 'music.163.com/'); // eslint-disable-line no-param-reassign
  url = url.replace('music.163.com/#/', 'music.163.com/'); // eslint-disable-line no-param-reassign
  if (url.search('//music.163.com/playlist') !== -1) {
    const match = /\/\/music.163.com\/playlist\/([0-9]+)/.exec(url);
    id = match ? match[1] : getParameterByName('id', url);
    result = {
      type: 'playlist',
      id: `neplaylist_${id}`,
    };
  } else if (url.search('//music.163.com/artist') !== -1) {
    result = {
      type: 'playlist',
      id: `neartist_${getParameterByName('id', url)}`,
    };
  } else if (url.search('//music.163.com/album') !== -1) {
    const match = /\/\/music.163.com\/album\/([0-9]+)/.exec(url);
    id = match ? match[1] : getParameterByName('id', url);
    result = {
      type: 'playlist',
      id: `nealbum_${id}`,
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
    case 'neplaylist':
      return ne_get_playlist(url);
    case 'nealbum':
      return ne_album(url);
    case 'neartist':
      return ne_artist(url);
    default:
      return null;
  }
}

function get_playlist_filters() {
  const recommend = [
    { id: '', name: '全部' },
    { id: 'toplist', name: '排行榜' },
    { id: '流行', name: '流行' },
    { id: '民谣', name: '民谣' },
    { id: '电子', name: '电子' },
    { id: '舞曲', name: '舞曲' },
    { id: '说唱', name: '说唱' },
    { id: '轻音乐', name: '轻音乐' },
    { id: '爵士', name: '爵士' },
    { id: '乡村', name: '乡村' },
  ];

  const all = [
    {
      category: '语种',
      filters: [
        { id: '华语', name: '华语' },
        { id: '欧美', name: '欧美' },
        { id: '日语', name: '日语' },
        { id: '韩语', name: '韩语' },
        { id: '粤语', name: '粤语' },
      ],
    },
    {
      category: '风格',
      filters: [
        { id: '流行', name: '流行' },
        { id: '民谣', name: '民谣' },
        { id: '电子', name: '电子' },
        { id: '舞曲', name: '舞曲' },
        { id: '说唱', name: '说唱' },
        { id: '轻音乐', name: '轻音乐' },
        { id: '爵士', name: '爵士' },
        { id: '乡村', name: '乡村' },
        { id: 'R%26B%2FSoul', name: 'R&B/Soul' },
        { id: '古典', name: '古典' },
        { id: '民族', name: '民族' },
        { id: '英伦', name: '英伦' },
        { id: '金属', name: '金属' },
        { id: '朋克', name: '朋克' },
        { id: '蓝调', name: '蓝调' },
        { id: '雷鬼', name: '雷鬼' },
        { id: '世界音乐', name: '世界音乐' },
        { id: '拉丁', name: '拉丁' },
        { id: 'New Age', name: 'New Age' },
        { id: '古风', name: '古风' },
        { id: '后摇', name: '后摇' },
        { id: 'Bossa Nova', name: 'Bossa Nova' },
      ],
    },
    {
      category: '场景',
      filters: [
        { id: '清晨', name: '清晨' },
        { id: '夜晚', name: '夜晚' },
        { id: '学习', name: '学习' },
        { id: '工作', name: '工作' },
        { id: '午休', name: '午休' },
        { id: '下午茶', name: '下午茶' },
        { id: '地铁', name: '地铁' },
        { id: '驾车', name: '驾车' },
        { id: '运动', name: '运动' },
        { id: '旅行', name: '旅行' },
        { id: '散步', name: '散步' },
        { id: '酒吧', name: '酒吧' },
      ],
    },
    {
      category: '情感',
      filters: [
        { id: '怀旧', name: '怀旧' },
        { id: '清新', name: '清新' },
        { id: '浪漫', name: '浪漫' },
        { id: '伤感', name: '伤感' },
        { id: '治愈', name: '治愈' },
        { id: '放松', name: '放松' },
        { id: '孤独', name: '孤独' },
        { id: '感动', name: '感动' },
        { id: '兴奋', name: '兴奋' },
        { id: '快乐', name: '快乐' },
        { id: '安静', name: '安静' },
        { id: '思念', name: '思念' },
      ],
    },
    {
      category: '主题',
      filters: [
        { id: '综艺', name: '综艺' },
        { id: '影视原声', name: '影视原声' },
        { id: 'ACG', name: 'ACG' },
        { id: '儿童', name: '儿童' },
        { id: '校园', name: '校园' },
        { id: '游戏', name: '游戏' },
        { id: '70后', name: '70后' },
        { id: '80后', name: '80后' },
        { id: '90后', name: '90后' },
        { id: '网络歌曲', name: '网络歌曲' },
        { id: 'KTV', name: 'KTV' },
        { id: '经典', name: '经典' },
        { id: '翻唱', name: '翻唱' },
        { id: '吉他', name: '吉他' },
        { id: '钢琴', name: '钢琴' },
        { id: '器乐', name: '器乐' },
        { id: '榜单', name: '榜单' },
        { id: '00后', name: '00后' },
      ],
    },
  ];
  return {
    success: (fn) => fn({ recommend, all }),
  };
}

function login(url) {
  // use chrome extension to modify referer.
  let target_url = 'https://music.163.com/weapi/login';
  const loginType = getParameterByName('type', url);

  const password = getParameterByName('password', url);

  let req_data = {};
  if (loginType === 'email') {
    const email = getParameterByName('email', url);

    req_data = {
      username: email,
      password: forge.md5
        .create()
        .update(forge.util.encodeUtf8(password))
        .digest()
        .toHex(),
      rememberLogin: 'true',
    };
  } else if (loginType === 'phone') {
    target_url = `https://music.163.com/weapi/login/cellphone`;
    const countrycode = getParameterByName('countrycode', url);
    const phone = getParameterByName('phone', url);
    req_data = {
      phone,
      countrycode,
      password: forge.md5
        .create()
        .update(forge.util.encodeUtf8(password))
        .digest()
        .toHex(),
      rememberLogin: 'true',
    };
  }

  const encrypt_req_data = weapi(req_data);
  const expire =
    (new Date().getTime() + 1e3 * 60 * 60 * 24 * 365 * 100) / 1000;

  cookieSet(
    {
      url: 'https://music.163.com',
      name: 'os',
      value: 'pc',
      expirationDate: expire,
    },
    (cookie) => { }
  );
  return {
    success: (fn) => {
      axios
        .post(target_url, new URLSearchParams(encrypt_req_data))
        .then((response) => {
          const { data } = response;
          const result = {
            is_login: true,
            user_id: data.account.id,
            user_name: data.account.userName,
            nickname: data.profile.nickname,
            avatar: data.profile.avatarUrl,
            platform: 'netease',
            data,
          };
          return fn({
            status: 'success',
            data: result,
          });
        })
        .catch(() =>
          fn({
            status: 'fail',
            data: {},
          })
        );
    },
  };
}

function get_user_playlist(url, playlistType) {
  const user_id = getParameterByName('user_id', url);
  const target_url = 'https://music.163.com/api/user/playlist';

  const req_data = {
    uid: user_id,
    limit: 1000,
    offset: 0,
    includeVideo: true,
  };

  return {
    success: (fn) => {
      axios
        .post(target_url, new URLSearchParams(req_data))
        .then((response) => {
          const playlists = [];
          response.data.playlist.forEach((item) => {
            if (playlistType === 'created' && item.subscribed !== false) {
              return;
            }
            if (playlistType === 'favorite' && item.subscribed !== true) {
              return;
            }
            const playlist = {
              cover_img_url: item.coverImgUrl,
              id: `neplaylist_${item.id}`,
              source_url: `https://music.163.com/#/playlist?id=${item.id}`,
              title: item.name,
            };
            playlists.push(playlist);
          });
          return fn({
            status: 'success',
            data: {
              playlists,
            },
          });
        });
    },
  };
}

function get_user_created_playlist(url) {
  return get_user_playlist(url, 'created');
}

function get_user_favorite_playlist(url) {
  return get_user_playlist(url, 'favorite');
}

function get_recommend_playlist() {
  const target_url = 'https://music.163.com/weapi/personalized/playlist';

  const req_data = {
    limit: 30,
    total: true,
    n: 1000,
  };

  const encrypt_req_data = weapi(req_data);

  return {
    success: (fn) => {
      axios
        .post(target_url, new URLSearchParams(encrypt_req_data))
        .then((response) => {
          const playlists = [];
          response.data.result.forEach((item) => {
            const playlist = {
              cover_img_url: item.picUrl,
              id: `neplaylist_${item.id}`,
              source_url: `https://music.163.com/#/playlist?id=${item.id}`,
              title: item.name,
            };
            playlists.push(playlist);
          });
          return fn({
            status: 'success',
            data: {
              playlists,
            },
          });
        });
    },
  };
}

function get_user() {
  const url = `https://music.163.com/api/nuser/account/get`;

  const encrypt_req_data = weapi({});
  return {
    success: (fn) => {
      axios.post(url, new URLSearchParams(encrypt_req_data)).then((res) => {
        let result = { is_login: false };
        let status = 'fail';
        if (res.data.account !== null) {
          status = 'success';
          const { data } = res;
          result = {
            is_login: true,
            user_id: data.account.id,
            user_name: data.account.userName,
            nickname: data.profile.nickname,
            avatar: data.profile.avatarUrl,
            platform: 'netease',
            data,
          };
        }

        return fn({
          status,
          data: result,
        });
      });
    },
  };
}

function get_login_url() {
  return `https://music.163.com/#/login`;
}

function logout() {
  cookieRemove(
    {
      url: 'https://music.163.com',
      name: 'MUSIC_U',
    },
    (cookie) => { }
  );
}

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