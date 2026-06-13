--
-- PostgreSQL database dump
--

\restrict Xa2HYSj5ShahDe2nLwFnjpMOYTXmhXwMusDLu0f30EOlHiiTbPLETSXWLoTicvQ

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-06-13 13:13:16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 32854)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5173 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 225 (class 1259 OID 32798)
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    post_id integer,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer,
    parent_comment_id integer,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 32797)
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comments_id_seq OWNER TO postgres;

--
-- TOC entry 5174 (class 0 OID 0)
-- Dependencies: 224
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- TOC entry 231 (class 1259 OID 32924)
-- Name: follows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.follows (
    id integer NOT NULL,
    follower_id integer NOT NULL,
    following_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT follows_check CHECK ((follower_id <> following_id))
);


ALTER TABLE public.follows OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 32923)
-- Name: follows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.follows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.follows_id_seq OWNER TO postgres;

--
-- TOC entry 5175 (class 0 OID 0)
-- Dependencies: 230
-- Name: follows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.follows_id_seq OWNED BY public.follows.id;


--
-- TOC entry 233 (class 1259 OID 32948)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    recipient_user_id integer NOT NULL,
    actor_user_id integer,
    type text NOT NULL,
    post_id integer,
    comment_id integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 32947)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- TOC entry 5176 (class 0 OID 0)
-- Dependencies: 232
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 227 (class 1259 OID 32828)
-- Name: post_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_likes (
    id integer NOT NULL,
    post_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.post_likes OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 32827)
-- Name: post_likes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.post_likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.post_likes_id_seq OWNER TO postgres;

--
-- TOC entry 5177 (class 0 OID 0)
-- Dependencies: 226
-- Name: post_likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.post_likes_id_seq OWNED BY public.post_likes.id;


--
-- TOC entry 229 (class 1259 OID 32893)
-- Name: post_media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_media (
    id integer NOT NULL,
    post_id integer NOT NULL,
    media_url text NOT NULL,
    media_type text DEFAULT 'image'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.post_media OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 32892)
-- Name: post_media_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.post_media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.post_media_id_seq OWNER TO postgres;

--
-- TOC entry 5178 (class 0 OID 0)
-- Dependencies: 228
-- Name: post_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.post_media_id_seq OWNED BY public.post_media.id;


--
-- TOC entry 223 (class 1259 OID 32786)
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    likes integer DEFAULT 0,
    user_id integer,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 32785)
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO postgres;

--
-- TOC entry 5179 (class 0 OID 0)
-- Dependencies: 222
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- TOC entry 235 (class 1259 OID 32985)
-- Name: saved_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_posts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.saved_posts OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 32984)
-- Name: saved_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.saved_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saved_posts_id_seq OWNER TO postgres;

--
-- TOC entry 5180 (class 0 OID 0)
-- Dependencies: 234
-- Name: saved_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.saved_posts_id_seq OWNED BY public.saved_posts.id;


--
-- TOC entry 221 (class 1259 OID 32773)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100),
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    bio text,
    profile_pic text,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 32772)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5181 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4936 (class 2604 OID 32801)
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- TOC entry 4945 (class 2604 OID 32927)
-- Name: follows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follows ALTER COLUMN id SET DEFAULT nextval('public.follows_id_seq'::regclass);


--
-- TOC entry 4947 (class 2604 OID 32951)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 4939 (class 2604 OID 32831)
-- Name: post_likes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes ALTER COLUMN id SET DEFAULT nextval('public.post_likes_id_seq'::regclass);


--
-- TOC entry 4941 (class 2604 OID 32896)
-- Name: post_media id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_media ALTER COLUMN id SET DEFAULT nextval('public.post_media_id_seq'::regclass);


--
-- TOC entry 4932 (class 2604 OID 32789)
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- TOC entry 4951 (class 2604 OID 32988)
-- Name: saved_posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_posts ALTER COLUMN id SET DEFAULT nextval('public.saved_posts_id_seq'::regclass);


--
-- TOC entry 4929 (class 2604 OID 32776)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5157 (class 0 OID 32798)
-- Dependencies: 225
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (id, post_id, content, created_at, user_id, parent_comment_id, updated_at) FROM stdin;
1	5	swapnasss	2026-05-28 17:02:50.988917	\N	\N	2026-06-01 14:44:35.277651+05:30
2	5	eecc	2026-05-28 17:03:00.025224	\N	\N	2026-06-01 14:44:35.277651+05:30
3	5	, dc lec le	2026-05-28 17:03:06.606054	\N	\N	2026-06-01 14:44:35.277651+05:30
4	5		2026-05-28 17:03:06.968614	\N	\N	2026-06-01 14:44:35.277651+05:30
5	5		2026-05-28 17:03:07.190985	\N	\N	2026-06-01 14:44:35.277651+05:30
6	4	,ce c;ec 3 x,qs	2026-05-28 17:03:21.569135	\N	\N	2026-06-01 14:44:35.277651+05:30
7	6	Nice post!	2026-05-29 13:54:51.00176	7	\N	2026-06-01 14:44:35.277651+05:30
9	55	kbjk j	2026-06-01 14:15:17.378087	1	\N	2026-06-01 14:44:35.277651+05:30
\.


--
-- TOC entry 5163 (class 0 OID 32924)
-- Dependencies: 231
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.follows (id, follower_id, following_id, created_at) FROM stdin;
1	5	1	2026-06-01 14:56:57.521426+05:30
2	1	5	2026-06-01 14:59:54.410703+05:30
\.


--
-- TOC entry 5165 (class 0 OID 32948)
-- Dependencies: 233
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, recipient_user_id, actor_user_id, type, post_id, comment_id, metadata, is_read, created_at) FROM stdin;
1	1	5	follow	\N	\N	{"source": "profile_actions"}	f	2026-06-01 14:56:57.521426+05:30
2	5	1	follow	\N	\N	{"source": "profile_actions"}	f	2026-06-01 14:59:54.410703+05:30
\.


--
-- TOC entry 5159 (class 0 OID 32828)
-- Dependencies: 227
-- Data for Name: post_likes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post_likes (id, post_id, user_id, created_at) FROM stdin;
1	6	7	2026-05-29 13:54:51.00176
4	6	1	2026-05-29 14:02:12.444507
21	56	5	2026-06-01 14:40:35.723462
22	55	5	2026-06-01 14:40:39.000672
23	2	5	2026-06-01 14:52:28.850517
24	1	5	2026-06-01 14:52:30.350863
29	58	5	2026-06-01 14:58:54.803727
\.


--
-- TOC entry 5161 (class 0 OID 32893)
-- Dependencies: 229
-- Data for Name: post_media; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post_media (id, post_id, media_url, media_type, sort_order, created_at) FROM stdin;
1	56	https://res.cloudinary.com/dg4ibjvzm/image/upload/v1780304806/socialfeed/post_media/ewlqgollpprlpncvtw1s.jpg	image	0	2026-06-01 14:36:47.616215+05:30
2	57	https://res.cloudinary.com/dg4ibjvzm/image/upload/v1780305020/socialfeed/post_media/asnz9julyasrb80nfi57.jpg	image	0	2026-06-01 14:40:21.922642+05:30
3	58	https://res.cloudinary.com/dg4ibjvzm/image/upload/v1780306107/socialfeed/post_media/hyuzqdowlm92ozzrrewj.jpg	image	0	2026-06-01 14:58:29.492156+05:30
\.


--
-- TOC entry 5155 (class 0 OID 32786)
-- Dependencies: 223
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, content, created_at, likes, user_id, updated_at) FROM stdin;
3	ckweclknc2huindmdc o  	2026-05-28 14:49:29.274282	0	\N	2026-06-01 14:44:35.277651+05:30
57		2026-06-01 14:40:21.922642	0	5	2026-06-01 14:44:35.277651+05:30
56	lknn	2026-06-01 14:36:47.616215	1	1	2026-06-01 14:44:35.277651+05:30
55		2026-06-01 14:14:07.6244	1	1	2026-06-01 14:44:35.277651+05:30
2	cjkqfqi	2026-05-28 14:47:33.484125	1	\N	2026-06-01 14:44:35.277651+05:30
1	this is my post i created	2026-05-28 14:11:43.12127	1	\N	2026-06-01 14:44:35.277651+05:30
6	Hello from Swapna	2026-05-29 13:54:51.00176	2	7	2026-06-01 14:44:35.277651+05:30
4		2026-05-28 14:54:32.49031	2	\N	2026-06-01 14:44:35.277651+05:30
5	jbbo	2026-05-28 14:54:40.707842	2	\N	2026-06-01 14:44:35.277651+05:30
58		2026-06-01 14:58:29.492156	1	5	2026-06-01 14:58:54.803727+05:30
\.


--
-- TOC entry 5167 (class 0 OID 32985)
-- Dependencies: 235
-- Data for Name: saved_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.saved_posts (id, user_id, post_id, created_at) FROM stdin;
\.


--
-- TOC entry 5153 (class 0 OID 32773)
-- Dependencies: 221
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password, created_at, bio, profile_pic, updated_at) FROM stdin;
3	swapna	swapnasaikota@gmail.com	$2b$10$pXJGXtM4az5o85Jb6aztUec7ebSwlsA9IdzGV2MjM9xJL7XnbJj22	2026-05-27 17:29:08.322846	\N	\N	2026-06-01 14:44:35.277651+05:30
7	swapna	swapna@example.com	$2a$06$j70TCudNLyXgI1.XC41Z0ebVjPFLsZ4fr9Ivq.M6Zy0ZVvT.7acu6	2026-05-29 13:54:51.00176	\N	\N	2026-06-01 14:44:35.277651+05:30
1	swapna	swapnakota3031@gmail.com	$2b$10$d8ARm5gf9WhJ3U9yzigz9uhR1SxGLB2.13S1Lly9xFL1q97pHq5ay	2026-05-27 16:45:49.318509	software devloper \n#backend	https://res.cloudinary.com/dg4ibjvzm/image/upload/v1780299381/socialfeed/profile_pictures/acbcfdxzbuk5vuuajsqh.jpg	2026-06-01 14:44:35.277651+05:30
5	swapna	kotasaiswapna@gmail.com	$2b$10$n9wRF4mPwyY8vf0RI.D6LuhH4mGdFBLAVmvrXZZbC0O5UxbkaKUPq	2026-05-27 17:30:24.786991		https://res.cloudinary.com/dg4ibjvzm/image/upload/v1780304954/socialfeed/profile_pictures/vjrbzmhbwpgbs1ps5dwm.jpg	2026-06-01 14:44:35.277651+05:30
\.


--
-- TOC entry 5182 (class 0 OID 0)
-- Dependencies: 224
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comments_id_seq', 9, true);


--
-- TOC entry 5183 (class 0 OID 0)
-- Dependencies: 230
-- Name: follows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.follows_id_seq', 2, true);


--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 232
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 2, true);


--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 226
-- Name: post_likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.post_likes_id_seq', 29, true);


--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 228
-- Name: post_media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.post_media_id_seq', 3, true);


--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 222
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 58, true);


--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 234
-- Name: saved_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.saved_posts_id_seq', 1, false);


--
-- TOC entry 5189 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- TOC entry 4963 (class 2606 OID 32808)
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- TOC entry 4976 (class 2606 OID 32936)
-- Name: follows follows_follower_id_following_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_following_id_key UNIQUE (follower_id, following_id);


--
-- TOC entry 4978 (class 2606 OID 32934)
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- TOC entry 4984 (class 2606 OID 32963)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4969 (class 2606 OID 32837)
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (id);


--
-- TOC entry 4971 (class 2606 OID 32839)
-- Name: post_likes post_likes_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- TOC entry 4974 (class 2606 OID 32908)
-- Name: post_media post_media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_media
    ADD CONSTRAINT post_media_pkey PRIMARY KEY (id);


--
-- TOC entry 4961 (class 2606 OID 32796)
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- TOC entry 4987 (class 2606 OID 32994)
-- Name: saved_posts saved_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_posts
    ADD CONSTRAINT saved_posts_pkey PRIMARY KEY (id);


--
-- TOC entry 4989 (class 2606 OID 32996)
-- Name: saved_posts saved_posts_user_id_post_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_posts
    ADD CONSTRAINT saved_posts_user_id_post_id_key UNIQUE (user_id, post_id);


--
-- TOC entry 4955 (class 2606 OID 32784)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4957 (class 2606 OID 32782)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4964 (class 1259 OID 33008)
-- Name: idx_comments_parent_comment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_parent_comment_id ON public.comments USING btree (parent_comment_id);


--
-- TOC entry 4965 (class 1259 OID 32851)
-- Name: idx_comments_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);


--
-- TOC entry 4979 (class 1259 OID 33010)
-- Name: idx_follows_follower_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_follows_follower_id ON public.follows USING btree (follower_id);


--
-- TOC entry 4980 (class 1259 OID 33011)
-- Name: idx_follows_following_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_follows_following_id ON public.follows USING btree (following_id);


--
-- TOC entry 4981 (class 1259 OID 33013)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (recipient_user_id, is_read);


--
-- TOC entry 4982 (class 1259 OID 33012)
-- Name: idx_notifications_recipient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_recipient_id ON public.notifications USING btree (recipient_user_id, created_at DESC);


--
-- TOC entry 4966 (class 1259 OID 32852)
-- Name: idx_post_likes_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_likes_post_id ON public.post_likes USING btree (post_id);


--
-- TOC entry 4967 (class 1259 OID 33009)
-- Name: idx_post_likes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_likes_user_id ON public.post_likes USING btree (user_id);


--
-- TOC entry 4972 (class 1259 OID 32914)
-- Name: idx_post_media_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_media_post_id ON public.post_media USING btree (post_id);


--
-- TOC entry 4958 (class 1259 OID 33007)
-- Name: idx_posts_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at DESC);


--
-- TOC entry 4959 (class 1259 OID 32850)
-- Name: idx_posts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);


--
-- TOC entry 4985 (class 1259 OID 33014)
-- Name: idx_saved_posts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_posts_user_id ON public.saved_posts USING btree (user_id);


--
-- TOC entry 4991 (class 2606 OID 32918)
-- Name: comments comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- TOC entry 4992 (class 2606 OID 32809)
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4993 (class 2606 OID 32822)
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4997 (class 2606 OID 32937)
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4998 (class 2606 OID 32942)
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4999 (class 2606 OID 32969)
-- Name: notifications notifications_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5000 (class 2606 OID 32979)
-- Name: notifications notifications_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- TOC entry 5001 (class 2606 OID 32974)
-- Name: notifications notifications_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 5002 (class 2606 OID 32964)
-- Name: notifications notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4994 (class 2606 OID 32840)
-- Name: post_likes post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4995 (class 2606 OID 32845)
-- Name: post_likes post_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4996 (class 2606 OID 32909)
-- Name: post_media post_media_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_media
    ADD CONSTRAINT post_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4990 (class 2606 OID 32817)
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5003 (class 2606 OID 33002)
-- Name: saved_posts saved_posts_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_posts
    ADD CONSTRAINT saved_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 5004 (class 2606 OID 32997)
-- Name: saved_posts saved_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_posts
    ADD CONSTRAINT saved_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-06-13 13:13:16

--
-- PostgreSQL database dump complete
--

\unrestrict Xa2HYSj5ShahDe2nLwFnjpMOYTXmhXwMusDLu0f30EOlHiiTbPLETSXWLoTicvQ

