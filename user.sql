PGDMP     4                      z            user    13.2    13.2     ?           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            ?           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            ?           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            ?           1262    43200    user    DATABASE     j   CREATE DATABASE "user" WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'English_United States.1252';
    DROP DATABASE "user";
                postgres    false            ?            1259    43201    users    TABLE     ?   CREATE TABLE public.users (
    username character varying(20) NOT NULL,
    password text NOT NULL,
    email character varying(50) NOT NULL,
    first_name character varying(30),
    last_name character varying(30),
    is_admin boolean NOT NULL
);
    DROP TABLE public.users;
       public         heap    postgres    false            ?          0    43201    users 
   TABLE DATA           [   COPY public.users (username, password, email, first_name, last_name, is_admin) FROM stdin;
    public          postgres    false    200   ?       "           2606    43208    users users_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (username);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public            postgres    false    200            ?   ?   x?M?Mo?0 ??s??+Ty?9!ʆ?l
٥,??@5??E?]?????T???(?M??9S???Um??T???4??m=sD?E??ϸ?%D???????[??3?ð??t6?fـ?k1Sऑ?e?,????d?2iA?????@^?۪???&?LZ#?Q?B??? ??4?????c}*?Ƈ????<{??C:?{:??A?l[??T?mť????B˝??;v??}?z^????_?ߥ??????H}CM???=g?     