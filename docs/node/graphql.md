# Node.js GraphQL 开发指南

本章将介绍如何在 Node.js 中使用 GraphQL 构建现代化的 API，包括 Schema 设计、Resolver 实现、查询优化、安全性等核心概念。

## GraphQL 基础

### 1. GraphQL 概述

GraphQL 是一种用于 API 的查询语言和运行时，它提供了一种更高效、强大和灵活的替代 REST 的方案。

**优势：**
- 精确获取所需数据
- 强类型系统
- 单一端点
- 实时订阅
- 自文档化

**核心概念：**
- Schema：定义 API 的结构
- Query：读取数据
- Mutation：修改数据
- Subscription：实时数据
- Resolver：数据获取逻辑

### 2. 环境搭建

```bash
# 安装依赖
npm install apollo-server-express graphql
npm install @graphql-tools/schema @graphql-tools/load-files
npm install graphql-subscriptions
npm install dataloader
npm install graphql-depth-limit graphql-query-complexity
```

```javascript
// server.js - 基础服务器设置
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { loadFilesSync } = require('@graphql-tools/load-files');
const path = require('path');

// 加载类型定义和解析器
const typeDefs = loadFilesSync(path.join(__dirname, './schema/**/*.graphql'));
const resolvers = loadFilesSync(path.join(__dirname, './resolvers/**/*.js'));

// 创建可执行的 Schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// 创建 Apollo Server
const server = new ApolloServer({
  schema,
  context: ({ req, connection }) => {
    // HTTP 请求上下文
    if (req) {
      return {
        user: req.user,
        dataSources: {
          userAPI: new UserAPI(),
          postAPI: new PostAPI()
        }
      };
    }
    
    // WebSocket 连接上下文（用于订阅）
    if (connection) {
      return connection.context;
    }
  },
  subscriptions: {
    path: '/graphql',
    onConnect: (connectionParams, webSocket) => {
      console.log('Client connected for subscriptions');
      return {
        user: connectionParams.user
      };
    },
    onDisconnect: () => {
      console.log('Client disconnected from subscriptions');
    }
  },
  playground: process.env.NODE_ENV === 'development',
  introspection: true
});

// 创建 Express 应用
const app = express();

// 应用 Apollo GraphQL 中间件
server.applyMiddleware({ app, path: '/graphql' });

// 启动服务器
const PORT = process.env.PORT || 4000;

const httpServer = app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`);
});

// 安装订阅处理器
server.installSubscriptionHandlers(httpServer);

module.exports = { app, server };
```

## Schema 设计

### 1. 类型定义

```graphql
# schema/user.graphql
type User {
  id: ID!
  username: String!
  email: String!
  profile: UserProfile
  posts: [Post!]!
  followers: [User!]!
  following: [User!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type UserProfile {
  firstName: String
  lastName: String
  bio: String
  avatar: String
  website: String
  location: String
}

input CreateUserInput {
  username: String!
  email: String!
  password: String!
  profile: UserProfileInput
}

input UpdateUserInput {
  username: String
  email: String
  profile: UserProfileInput
}

input UserProfileInput {
  firstName: String
  lastName: String
  bio: String
  avatar: String
  website: String
  location: String
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}
```

```graphql
# schema/post.graphql
type Post {
  id: ID!
  title: String!
  content: String!
  excerpt: String
  author: User!
  tags: [Tag!]!
  comments: [Comment!]!
  likes: [Like!]!
  likesCount: Int!
  commentsCount: Int!
  published: Boolean!
  publishedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Comment {
  id: ID!
  content: String!
  author: User!
  post: Post!
  parent: Comment
  replies: [Comment!]!
  likes: [Like!]!
  likesCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Like {
  id: ID!
  user: User!
  post: Post
  comment: Comment
  createdAt: DateTime!
}

type Tag {
  id: ID!
  name: String!
  slug: String!
  posts: [Post!]!
  postsCount: Int!
}

input CreatePostInput {
  title: String!
  content: String!
  excerpt: String
  tags: [String!]
  published: Boolean = false
}

input UpdatePostInput {
  title: String
  content: String
  excerpt: String
  tags: [String!]
  published: Boolean
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}
```

```graphql
# schema/common.graphql
scalar DateTime
scalar JSON

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

enum SortOrder {
  ASC
  DESC
}

input PaginationInput {
  first: Int
  after: String
  last: Int
  before: String
}

input SortInput {
  field: String!
  order: SortOrder = ASC
}

type Query {
  # 用户查询
  user(id: ID!): User
  users(
    pagination: PaginationInput
    sort: SortInput
    search: String
  ): UserConnection!
  me: User
  
  # 文章查询
  post(id: ID!): Post
  posts(
    pagination: PaginationInput
    sort: SortInput
    authorId: ID
    tag: String
    published: Boolean
    search: String
  ): PostConnection!
  
  # 标签查询
  tags: [Tag!]!
  tag(slug: String!): Tag
}

type Mutation {
  # 用户操作
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
  followUser(userId: ID!): User!
  unfollowUser(userId: ID!): User!
  
  # 文章操作
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!
  publishPost(id: ID!): Post!
  unpublishPost(id: ID!): Post!
  
  # 互动操作
  likePost(postId: ID!): Like!
  unlikePost(postId: ID!): Boolean!
  createComment(postId: ID!, content: String!, parentId: ID): Comment!
  updateComment(id: ID!, content: String!): Comment!
  deleteComment(id: ID!): Boolean!
  likeComment(commentId: ID!): Like!
  unlikeComment(commentId: ID!): Boolean!
}

type Subscription {
  # 实时通知
  postCreated: Post!
  postUpdated(id: ID!): Post!
  commentAdded(postId: ID!): Comment!
  userFollowed(userId: ID!): User!
  
  # 实时统计
  postLikesCount(postId: ID!): Int!
  userFollowersCount(userId: ID!): Int!
}
```

### 2. 自定义标量类型

```javascript
// scalars/DateTime.js
const { GraphQLScalarType, GraphQLError } = require('graphql');
const { Kind } = require('graphql/language');

const DateTimeType = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  
  serialize(value) {
    // 发送给客户端时的序列化
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    
    throw new GraphQLError(`Value is not a valid DateTime: ${value}`);
  },
  
  parseValue(value) {
    // 从客户端变量解析
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new GraphQLError(`Value is not a valid DateTime: ${value}`);
      }
      return date;
    }
    
    throw new GraphQLError(`Value is not a valid DateTime: ${value}`);
  },
  
  parseLiteral(ast) {
    // 从查询字面量解析
    if (ast.kind === Kind.STRING) {
      const date = new Date(ast.value);
      if (isNaN(date.getTime())) {
        throw new GraphQLError(`Value is not a valid DateTime: ${ast.value}`);
      }
      return date;
    }
    
    throw new GraphQLError(`Can only parse strings to DateTime but got a: ${ast.kind}`);
  }
});

module.exports = DateTimeType;
```

```javascript
// scalars/JSON.js
const { GraphQLScalarType, GraphQLError } = require('graphql');
const { Kind } = require('graphql/language');

const JSONType = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  
  serialize(value) {
    return value;
  },
  
  parseValue(value) {
    return value;
  },
  
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT:
        return parseObject(ast);
      case Kind.LIST:
        return ast.values.map(parseLiteral);
      default:
        return null;
    }
  }
});

function parseObject(ast) {
  const value = Object.create(null);
  ast.fields.forEach(field => {
    value[field.name.value] = parseLiteral(field.value);
  });
  return value;
}

function parseLiteral(ast) {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT:
      return parseObject(ast);
    case Kind.LIST:
      return ast.values.map(parseLiteral);
    default:
      return null;
  }
}

module.exports = JSONType;
```

## Resolver 实现

### 1. 查询解析器

```javascript
// resolvers/userResolvers.js
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const DataLoader = require('dataloader');

class UserResolvers {
  constructor() {
    // 创建 DataLoader 实例
    this.userLoader = new DataLoader(this.batchUsers.bind(this));
    this.userPostsLoader = new DataLoader(this.batchUserPosts.bind(this));
    this.userFollowersLoader = new DataLoader(this.batchUserFollowers.bind(this));
  }
  
  // 批量加载用户
  async batchUsers(userIds) {
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map(user => [user._id.toString(), user]));
    return userIds.map(id => userMap.get(id.toString()) || null);
  }
  
  // 批量加载用户文章
  async batchUserPosts(userIds) {
    const posts = await Post.find({ author: { $in: userIds } });
    const postsByUser = new Map();
    
    posts.forEach(post => {
      const userId = post.author.toString();
      if (!postsByUser.has(userId)) {
        postsByUser.set(userId, []);
      }
      postsByUser.get(userId).push(post);
    });
    
    return userIds.map(id => postsByUser.get(id.toString()) || []);
  }
  
  // 批量加载用户关注者
  async batchUserFollowers(userIds) {
    const follows = await Follow.find({ following: { $in: userIds } }).populate('follower');
    const followersByUser = new Map();
    
    follows.forEach(follow => {
      const userId = follow.following.toString();
      if (!followersByUser.has(userId)) {
        followersByUser.set(userId, []);
      }
      followersByUser.get(userId).push(follow.follower);
    });
    
    return userIds.map(id => followersByUser.get(id.toString()) || []);
  }
  
  // Query 解析器
  Query = {
    user: async (parent, { id }, context) => {
      return this.userLoader.load(id);
    },
    
    users: async (parent, { pagination, sort, search }, context) => {
      const { first, after, last, before } = pagination || {};
      const { field, order } = sort || { field: 'createdAt', order: 'DESC' };
      
      // 构建查询条件
      const query = {};
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } }
        ];
      }
      
      // 游标分页
      if (after) {
        const afterUser = await User.findById(after);
        if (afterUser) {
          query[field] = order === 'ASC' 
            ? { $gt: afterUser[field] }
            : { $lt: afterUser[field] };
        }
      }
      
      if (before) {
        const beforeUser = await User.findById(before);
        if (beforeUser) {
          query[field] = order === 'ASC'
            ? { $lt: beforeUser[field] }
            : { $gt: beforeUser[field] };
        }
      }
      
      // 执行查询
      const limit = first || last || 10;
      const sortOrder = order === 'ASC' ? 1 : -1;
      
      const users = await User.find(query)
        .sort({ [field]: sortOrder })
        .limit(limit + 1);
      
      const hasNextPage = users.length > limit;
      const hasPreviousPage = !!after;
      
      const edges = users.slice(0, limit).map(user => ({
        node: user,
        cursor: user._id.toString()
      }));
      
      const totalCount = await User.countDocuments(query);
      
      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
        },
        totalCount
      };
    },
    
    me: async (parent, args, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      return this.userLoader.load(user.id);
    }
  };
  
  // User 类型解析器
  User = {
    posts: async (user, args, context) => {
      return this.userPostsLoader.load(user._id.toString());
    },
    
    followers: async (user, args, context) => {
      return this.userFollowersLoader.load(user._id.toString());
    },
    
    following: async (user, args, context) => {
      const follows = await Follow.find({ follower: user._id }).populate('following');
      return follows.map(follow => follow.following);
    }
  };
  
  // Mutation 解析器
  Mutation = {
    createUser: async (parent, { input }, context) => {
      const { username, email, password, profile } = input;
      
      // 验证用户名和邮箱唯一性
      const existingUser = await User.findOne({
        $or: [{ username }, { email }]
      });
      
      if (existingUser) {
        throw new UserInputError('Username or email already exists');
      }
      
      // 创建用户
      const user = new User({
        username,
        email,
        password: await bcrypt.hash(password, 10),
        profile
      });
      
      await user.save();
      
      return user;
    },
    
    updateUser: async (parent, { id, input }, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      if (user.id !== id) {
        throw new ForbiddenError('You can only update your own profile');
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: input },
        { new: true, runValidators: true }
      );
      
      if (!updatedUser) {
        throw new UserInputError('User not found');
      }
      
      // 清除缓存
      this.userLoader.clear(id);
      
      return updatedUser;
    },
    
    deleteUser: async (parent, { id }, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      if (user.id !== id && user.role !== 'admin') {
        throw new ForbiddenError('You can only delete your own account');
      }
      
      const deletedUser = await User.findByIdAndDelete(id);
      
      if (!deletedUser) {
        throw new UserInputError('User not found');
      }
      
      // 清除相关数据
      await Post.deleteMany({ author: id });
      await Follow.deleteMany({ $or: [{ follower: id }, { following: id }] });
      
      // 清除缓存
      this.userLoader.clear(id);
      
      return true;
    },
    
    followUser: async (parent, { userId }, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      if (user.id === userId) {
        throw new UserInputError('You cannot follow yourself');
      }
      
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        throw new UserInputError('User not found');
      }
      
      // 检查是否已经关注
      const existingFollow = await Follow.findOne({
        follower: user.id,
        following: userId
      });
      
      if (existingFollow) {
        throw new UserInputError('You are already following this user');
      }
      
      // 创建关注关系
      const follow = new Follow({
        follower: user.id,
        following: userId
      });
      
      await follow.save();
      
      // 清除缓存
      this.userFollowersLoader.clear(userId);
      
      return targetUser;
    },
    
    unfollowUser: async (parent, { userId }, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const follow = await Follow.findOneAndDelete({
        follower: user.id,
        following: userId
      });
      
      if (!follow) {
        throw new UserInputError('You are not following this user');
      }
      
      // 清除缓存
      this.userFollowersLoader.clear(userId);
      
      const targetUser = await User.findById(userId);
      return targetUser;
    }
  };
}

module.exports = new UserResolvers();
```

### 2. 文章解析器

```javascript
// resolvers/postResolvers.js
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { PubSub } = require('graphql-subscriptions');
const DataLoader = require('dataloader');

const pubsub = new PubSub();

class PostResolvers {
  constructor() {
    this.postLoader = new DataLoader(this.batchPosts.bind(this));
    this.postCommentsLoader = new DataLoader(this.batchPostComments.bind(this));
    this.postLikesLoader = new DataLoader(this.batchPostLikes.bind(this));
    this.postTagsLoader = new DataLoader(this.batchPostTags.bind(this));
  }
  
  async batchPosts(postIds) {
    const posts = await Post.find({ _id: { $in: postIds } });
    const postMap = new Map(posts.map(post => [post._id.toString(), post]));
    return postIds.map(id => postMap.get(id.toString()) || null);
  }
  
  async batchPostComments(postIds) {
    const comments = await Comment.find({ post: { $in: postIds } })
      .populate('author')
      .sort({ createdAt: -1 });
    
    const commentsByPost = new Map();
    comments.forEach(comment => {
      const postId = comment.post.toString();
      if (!commentsByPost.has(postId)) {
        commentsByPost.set(postId, []);
      }
      commentsByPost.get(postId).push(comment);
    });
    
    return postIds.map(id => commentsByPost.get(id.toString()) || []);
  }
  
  async batchPostLikes(postIds) {
    const likes = await Like.find({ post: { $in: postIds } }).populate('user');
    const likesByPost = new Map();
    
    likes.forEach(like => {
      const postId = like.post.toString();
      if (!likesByPost.has(postId)) {
        likesByPost.set(postId, []);
      }
      likesByPost.get(postId).push(like);
    });
    
    return postIds.map(id => likesByPost.get(id.toString()) || []);
  }
  
  async batchPostTags(postIds) {
    const posts = await Post.find({ _id: { $in: postIds } }).populate('tags');
    const tagsByPost = new Map();
    
    posts.forEach(post => {
      tagsByPost.set(post._id.toString(), post.tags);
    });
    
    return postIds.map(id => tagsByPost.get(id.toString()) || []);
  }
  
  Query = {
    post: async (parent, { id }, context) => {
      const post = await this.postLoader.load(id);
      
      if (!post) {
        throw new UserInputError('Post not found');
      }
      
      // 检查访问权限
      if (!post.published && (!context.user || context.user.id !== post.author.toString())) {
        throw new ForbiddenError('Post not published');
      }
      
      return post;
    },
    
    posts: async (parent, args, context) => {
      const { pagination, sort, authorId, tag, published, search } = args;
      const { first, after, last, before } = pagination || {};
      const { field, order } = sort || { field: 'createdAt', order: 'DESC' };
      
      // 构建查询条件
      const query = {};
      
      if (authorId) {
        query.author = authorId;
      }
      
      if (published !== undefined) {
        query.published = published;
      } else if (!context.user) {
        // 未登录用户只能看到已发布的文章
        query.published = true;
      }
      
      if (tag) {
        const tagDoc = await Tag.findOne({ slug: tag });
        if (tagDoc) {
          query.tags = tagDoc._id;
        } else {
          // 标签不存在，返回空结果
          return {
            edges: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null
            },
            totalCount: 0
          };
        }
      }
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { excerpt: { $regex: search, $options: 'i' } }
        ];
      }
      
      // 游标分页逻辑
      if (after) {
        const afterPost = await Post.findById(after);
        if (afterPost) {
          query[field] = order === 'ASC'
            ? { $gt: afterPost[field] }
            : { $lt: afterPost[field] };
        }
      }
      
      const limit = first || last || 10;
      const sortOrder = order === 'ASC' ? 1 : -1;
      
      const posts = await Post.find(query)
        .populate('author')
        .sort({ [field]: sortOrder })
        .limit(limit + 1);
      
      const hasNextPage = posts.length > limit;
      const edges = posts.slice(0, limit).map(post => ({
        node: post,
        cursor: post._id.toString()
      }));
      
      const totalCount = await Post.countDocuments(query);
      
      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
        },
        totalCount
      };
    }
  };
  
  Post = {
    author: async (post, args, context) => {
      return context.dataSources.userAPI.getUserById(post.author);
    },
    
    comments: async (post, args, context) => {
      return this.postCommentsLoader.load(post._id.toString());
    },
    
    likes: async (post, args, context) => {
      return this.postLikesLoader.load(post._id.toString());
    },
    
    tags: async (post, args, context) => {
      return this.postTagsLoader.load(post._id.toString());
    },
    
    likesCount: async (post, args, context) => {
      const likes = await this.postLikesLoader.load(post._id.toString());
      return likes.length;
    },
    
    commentsCount: async (post, args, context) => {
      const comments = await this.postCommentsLoader.load(post._id.toString());
      return comments.length;
    }
  };
  
  Mutation = {
    createPost: async (parent, { input }, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in to create a post');
      }
      
      const { title, content, excerpt, tags, published } = input;
      
      // 处理标签
      const tagIds = [];
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          let tag = await Tag.findOne({ name: tagName });
          if (!tag) {
            tag = new Tag({
              name: tagName,
              slug: tagName.toLowerCase().replace(/\s+/g, '-')
            });
            await tag.save();
          }
          tagIds.push(tag._id);
        }
      }
      
      // 创建文章
      const post = new Post({
        title,
        content,
        excerpt: excerpt || content.substring(0, 200),
        author: user.id,
        tags: tagIds,
        published,
        publishedAt: published ? new Date() : null
      });
      
      await post.save();
      await post.populate(['author', 'tags']);
      
      // 发布订阅事件
      if (published) {
        pubsub.publish('POST_CREATED', { postCreated: post });
      }
      
      return post;
    },
    
    updatePost: async (parent, { id, input }, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const post = await Post.findById(id);
      if (!post) {
        throw new UserInputError('Post not found');
      }
      
      if (post.author.toString() !== user.id) {
        throw new ForbiddenError('You can only edit your own posts');
      }
      
      const { tags, ...updateData } = input;
      
      // 处理标签更新
      if (tags) {
        const tagIds = [];
        for (const tagName of tags) {
          let tag = await Tag.findOne({ name: tagName });
          if (!tag) {
            tag = new Tag({
              name: tagName,
              slug: tagName.toLowerCase().replace(/\s+/g, '-')
            });
            await tag.save();
          }
          tagIds.push(tag._id);
        }
        updateData.tags = tagIds;
      }
      
      const updatedPost = await Post.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate(['author', 'tags']);
      
      // 清除缓存
      this.postLoader.clear(id);
      this.postTagsLoader.clear(id);
      
      // 发布订阅事件
      pubsub.publish('POST_UPDATED', { postUpdated: updatedPost });
      
      return updatedPost;
    },
    
    deletePost: async (parent, { id }, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const post = await Post.findById(id);
      if (!post) {
        throw new UserInputError('Post not found');
      }
      
      if (post.author.toString() !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You can only delete your own posts');
      }
      
      // 删除相关数据
      await Comment.deleteMany({ post: id });
      await Like.deleteMany({ post: id });
      await Post.findByIdAndDelete(id);
      
      // 清除缓存
      this.postLoader.clear(id);
      this.postCommentsLoader.clear(id);
      this.postLikesLoader.clear(id);
      this.postTagsLoader.clear(id);
      
      return true;
    },
    
    likePost: async (parent, { postId }, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const post = await Post.findById(postId);
      if (!post) {
        throw new UserInputError('Post not found');
      }
      
      // 检查是否已经点赞
      const existingLike = await Like.findOne({
        user: user.id,
        post: postId
      });
      
      if (existingLike) {
        throw new UserInputError('You have already liked this post');
      }
      
      // 创建点赞
      const like = new Like({
        user: user.id,
        post: postId
      });
      
      await like.save();
      await like.populate('user');
      
      // 清除缓存
      this.postLikesLoader.clear(postId);
      
      // 发布实时更新
      const likesCount = await Like.countDocuments({ post: postId });
      pubsub.publish('POST_LIKES_COUNT', {
        postLikesCount: likesCount,
        postId
      });
      
      return like;
    }
  };
  
  Subscription = {
    postCreated: {
      subscribe: () => pubsub.asyncIterator(['POST_CREATED'])
    },
    
    postUpdated: {
      subscribe: (parent, { id }) => {
        return pubsub.asyncIterator([`POST_UPDATED_${id}`]);
      }
    },
    
    commentAdded: {
      subscribe: (parent, { postId }) => {
        return pubsub.asyncIterator([`COMMENT_ADDED_${postId}`]);
      }
    },
    
    postLikesCount: {
      subscribe: (parent, { postId }) => {
        return pubsub.asyncIterator([`POST_LIKES_COUNT_${postId}`]);
      }
    }
  };
}

module.exports = new PostResolvers();
```

## 数据加载优化

### 1. DataLoader 实现

```javascript
// dataloaders/index.js
const DataLoader = require('dataloader');
const { User, Post, Comment, Like, Tag } = require('../models');

class DataLoaders {
  constructor() {
    // 用户相关
    this.userLoader = new DataLoader(this.batchUsers.bind(this));
    this.userPostsLoader = new DataLoader(this.batchUserPosts.bind(this));
    this.userFollowersLoader = new DataLoader(this.batchUserFollowers.bind(this));
    
    // 文章相关
    this.postLoader = new DataLoader(this.batchPosts.bind(this));
    this.postAuthorLoader = new DataLoader(this.batchPostAuthors.bind(this));
    this.postCommentsLoader = new DataLoader(this.batchPostComments.bind(this));
    this.postLikesLoader = new DataLoader(this.batchPostLikes.bind(this));
    this.postTagsLoader = new DataLoader(this.batchPostTags.bind(this));
    
    // 评论相关
    this.commentLoader = new DataLoader(this.batchComments.bind(this));
    this.commentAuthorLoader = new DataLoader(this.batchCommentAuthors.bind(this));
    this.commentRepliesLoader = new DataLoader(this.batchCommentReplies.bind(this));
    
    // 标签相关
    this.tagLoader = new DataLoader(this.batchTags.bind(this));
    this.tagPostsLoader = new DataLoader(this.batchTagPosts.bind(this));
  }
  
  // 用户批量加载
  async batchUsers(userIds) {
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map(user => [user._id.toString(), user]));
    return userIds.map(id => userMap.get(id.toString()) || null);
  }
  
  async batchUserPosts(userIds) {
    const posts = await Post.find({ author: { $in: userIds } })
      .sort({ createdAt: -1 });
    
    const postsByUser = new Map();
    posts.forEach(post => {
      const userId = post.author.toString();
      if (!postsByUser.has(userId)) {
        postsByUser.set(userId, []);
      }
      postsByUser.get(userId).push(post);
    });
    
    return userIds.map(id => postsByUser.get(id.toString()) || []);
  }
  
  async batchUserFollowers(userIds) {
    const follows = await Follow.find({ following: { $in: userIds } })
      .populate('follower');
    
    const followersByUser = new Map();
    follows.forEach(follow => {
      const userId = follow.following.toString();
      if (!followersByUser.has(userId)) {
        followersByUser.set(userId, []);
      }
      followersByUser.get(userId).push(follow.follower);
    });
    
    return userIds.map(id => followersByUser.get(id.toString()) || []);
  }
  
  // 文章批量加载
  async batchPosts(postIds) {
    const posts = await Post.find({ _id: { $in: postIds } });
    const postMap = new Map(posts.map(post => [post._id.toString(), post]));
    return postIds.map(id => postMap.get(id.toString()) || null);
  }
  
  async batchPostAuthors(postIds) {
    const posts = await Post.find({ _id: { $in: postIds } }).populate('author');
    const authorsByPost = new Map();
    
    posts.forEach(post => {
      authorsByPost.set(post._id.toString(), post.author);
    });
    
    return postIds.map(id => authorsByPost.get(id.toString()) || null);
  }
  
  async batchPostComments(postIds) {
    const comments = await Comment.find({ post: { $in: postIds } })
      .populate('author')
      .sort({ createdAt: -1 });
    
    const commentsByPost = new Map();
    comments.forEach(comment => {
      const postId = comment.post.toString();
      if (!commentsByPost.has(postId)) {
        commentsByPost.set(postId, []);
      }
      commentsByPost.get(postId).push(comment);
    });
    
    return postIds.map(id => commentsByPost.get(id.toString()) || []);
  }
  
  async batchPostLikes(postIds) {
    const likes = await Like.find({ post: { $in: postIds } })
      .populate('user');
    
    const likesByPost = new Map();
    likes.forEach(like => {
      const postId = like.post.toString();
      if (!likesByPost.has(postId)) {
        likesByPost.set(postId, []);
      }
      likesByPost.get(postId).push(like);
    });
    
    return postIds.map(id => likesByPost.get(id.toString()) || []);
  }
  
  async batchPostTags(postIds) {
    const posts = await Post.find({ _id: { $in: postIds } })
      .populate('tags');
    
    const tagsByPost = new Map();
    posts.forEach(post => {
      tagsByPost.set(post._id.toString(), post.tags);
    });
    
    return postIds.map(id => tagsByPost.get(id.toString()) || []);
  }
  
  // 评论批量加载
  async batchComments(commentIds) {
    const comments = await Comment.find({ _id: { $in: commentIds } });
    const commentMap = new Map(comments.map(comment => [comment._id.toString(), comment]));
    return commentIds.map(id => commentMap.get(id.toString()) || null);
  }
  
  async batchCommentAuthors(commentIds) {
    const comments = await Comment.find({ _id: { $in: commentIds } })
      .populate('author');
    
    const authorsByComment = new Map();
    comments.forEach(comment => {
      authorsByComment.set(comment._id.toString(), comment.author);
    });
    
    return commentIds.map(id => authorsByComment.get(id.toString()) || null);
  }
  
  async batchCommentReplies(commentIds) {
    const replies = await Comment.find({ parent: { $in: commentIds } })
      .populate('author')
      .sort({ createdAt: 1 });
    
    const repliesByComment = new Map();
    replies.forEach(reply => {
      const parentId = reply.parent.toString();
      if (!repliesByComment.has(parentId)) {
        repliesByComment.set(parentId, []);
      }
      repliesByComment.get(parentId).push(reply);
    });
    
    return commentIds.map(id => repliesByComment.get(id.toString()) || []);
  }
  
  // 标签批量加载
  async batchTags(tagIds) {
    const tags = await Tag.find({ _id: { $in: tagIds } });
    const tagMap = new Map(tags.map(tag => [tag._id.toString(), tag]));
    return tagIds.map(id => tagMap.get(id.toString()) || null);
  }
  
  async batchTagPosts(tagIds) {
    const posts = await Post.find({ tags: { $in: tagIds } })
      .populate('author')
      .sort({ createdAt: -1 });
    
    const postsByTag = new Map();
    posts.forEach(post => {
      post.tags.forEach(tagId => {
        const tagIdStr = tagId.toString();
        if (!postsByTag.has(tagIdStr)) {
          postsByTag.set(tagIdStr, []);
        }
        postsByTag.get(tagIdStr).push(post);
      });
    });
    
    return tagIds.map(id => postsByTag.get(id.toString()) || []);
  }
  
  // 清除缓存方法
  clearUser(userId) {
    this.userLoader.clear(userId);
    this.userPostsLoader.clear(userId);
    this.userFollowersLoader.clear(userId);
  }
  
  clearPost(postId) {
    this.postLoader.clear(postId);
    this.postCommentsLoader.clear(postId);
    this.postLikesLoader.clear(postId);
    this.postTagsLoader.clear(postId);
  }
  
  clearComment(commentId) {
    this.commentLoader.clear(commentId);
    this.commentRepliesLoader.clear(commentId);
  }
  
  clearTag(tagId) {
    this.tagLoader.clear(tagId);
    this.tagPostsLoader.clear(tagId);
  }
}

module.exports = DataLoaders;
```

### 2. 查询复杂度控制

```javascript
// middleware/queryComplexity.js
const depthLimit = require('graphql-depth-limit');
const costAnalysis = require('graphql-query-complexity').costAnalysisMaximumCostRule;
const { createComplexityLimitRule } = require('graphql-query-complexity');

// 查询深度限制
const depthLimitRule = depthLimit(10);

// 查询复杂度分析
const complexityLimitRule = createComplexityLimitRule(1000, {
  maximumCost: 1000,
  onComplete: (cost) => {
    console.log(`Query cost: ${cost}`);
  },
  createError: (max, actual) => {
    return new Error(`Query cost ${actual} exceeds maximum cost ${max}`);
  },
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
  introspectionCost: 1000
});

// 自定义复杂度计算
const typeComplexityMap = {
  Query: {
    users: { complexity: ({ args, childComplexity }) => {
      const first = args.first || 10;
      return first * childComplexity;
    }},
    posts: { complexity: ({ args, childComplexity }) => {
      const first = args.first || 10;
      return first * childComplexity;
    }}
  },
  User: {
    posts: { complexity: ({ args, childComplexity }) => {
      return 5 * childComplexity; // 用户文章查询成本较高
    }},
    followers: { complexity: ({ args, childComplexity }) => {
      return 3 * childComplexity;
    }}
  },
  Post: {
    comments: { complexity: ({ args, childComplexity }) => {
      return 2 * childComplexity;
    }}
  }
};

module.exports = {
  depthLimitRule,
  complexityLimitRule,
  typeComplexityMap
};
```

## 实时订阅

### 1. 订阅实现

```javascript
// subscriptions/index.js
const { PubSub, withFilter } = require('graphql-subscriptions');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const Redis = require('ioredis');

// 创建 Redis 发布订阅
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null
};

const pubsub = new RedisPubSub({
  publisher: new Redis(redisOptions),
  subscriber: new Redis(redisOptions)
});

// 订阅事件常量
const SUBSCRIPTION_EVENTS = {
  POST_CREATED: 'POST_CREATED',
  POST_UPDATED: 'POST_UPDATED',
  POST_DELETED: 'POST_DELETED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  COMMENT_UPDATED: 'COMMENT_UPDATED',
  COMMENT_DELETED: 'COMMENT_DELETED',
  USER_FOLLOWED: 'USER_FOLLOWED',
  USER_UNFOLLOWED: 'USER_UNFOLLOWED',
  POST_LIKED: 'POST_LIKED',
  POST_UNLIKED: 'POST_UNLIKED',
  NOTIFICATION_CREATED: 'NOTIFICATION_CREATED'
};

// 订阅解析器
const subscriptionResolvers = {
  Subscription: {
    // 文章创建订阅
    postCreated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_EVENTS.POST_CREATED]),
        (payload, variables, context) => {
          // 只有已发布的文章才推送给订阅者
          return payload.postCreated.published;
        }
      )
    },
    
    // 文章更新订阅
    postUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_EVENTS.POST_UPDATED]),
        (payload, variables) => {
          // 只订阅特定文章的更新
          return payload.postUpdated.id === variables.id;
        }
      )
    },
    
    // 评论添加订阅
    commentAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_EVENTS.COMMENT_ADDED]),
        (payload, variables) => {
          // 只订阅特定文章的评论
          return payload.commentAdded.post.toString() === variables.postId;
        }
      )
    },
    
    // 用户关注订阅
    userFollowed: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_EVENTS.USER_FOLLOWED]),
        (payload, variables, context) => {
          // 只有被关注的用户才能收到通知
          return payload.userFollowed.id === variables.userId;
        }
      ),
      resolve: (payload) => {
        return payload.userFollowed;
      }
    },
    
    // 文章点赞数实时更新
    postLikesCount: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_EVENTS.POST_LIKED, SUBSCRIPTION_EVENTS.POST_UNLIKED]),
        (payload, variables) => {
          return payload.postId === variables.postId;
        }
      ),
      resolve: (payload) => {
        return payload.likesCount;
      }
    },
    
    // 用户关注者数量实时更新
    userFollowersCount: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_EVENTS.USER_FOLLOWED, SUBSCRIPTION_EVENTS.USER_UNFOLLOWED]),
        (payload, variables) => {
          return payload.userId === variables.userId;
        }
      ),
      resolve: (payload) => {
        return payload.followersCount;
      }
    },
    
    // 通知订阅
    notificationCreated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_EVENTS.NOTIFICATION_CREATED]),
        (payload, variables, context) => {
          // 只推送给目标用户
          return context.user && payload.notificationCreated.userId === context.user.id;
        }
      )
    }
  }
};

// 发布事件的辅助函数
class SubscriptionPublisher {
  static async publishPostCreated(post) {
    await pubsub.publish(SUBSCRIPTION_EVENTS.POST_CREATED, {
      postCreated: post
    });
  }
  
  static async publishPostUpdated(post) {
    await pubsub.publish(SUBSCRIPTION_EVENTS.POST_UPDATED, {
      postUpdated: post
    });
  }
  
  static async publishCommentAdded(comment) {
    await pubsub.publish(SUBSCRIPTION_EVENTS.COMMENT_ADDED, {
      commentAdded: comment
    });
  }
  
  static async publishUserFollowed(follower, following) {
    await pubsub.publish(SUBSCRIPTION_EVENTS.USER_FOLLOWED, {
      userFollowed: following,
      follower: follower
    });
    
    // 同时更新关注者数量
    const followersCount = await Follow.countDocuments({ following: following.id });
    await pubsub.publish(SUBSCRIPTION_EVENTS.USER_FOLLOWED, {
      userId: following.id,
      followersCount
    });
  }
  
  static async publishPostLiked(postId, likesCount) {
    await pubsub.publish(SUBSCRIPTION_EVENTS.POST_LIKED, {
      postId,
      likesCount
    });
  }
  
  static async publishPostUnliked(postId, likesCount) {
    await pubsub.publish(SUBSCRIPTION_EVENTS.POST_UNLIKED, {
      postId,
      likesCount
    });
  }
  
  static async publishNotificationCreated(notification) {
    await pubsub.publish(SUBSCRIPTION_EVENTS.NOTIFICATION_CREATED, {
      notificationCreated: notification
    });
  }
}

module.exports = {
  pubsub,
  subscriptionResolvers,
  SubscriptionPublisher,
  SUBSCRIPTION_EVENTS
};
```

### 2. WebSocket 认证

```javascript
// auth/websocketAuth.js
const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('apollo-server-express');

class WebSocketAuth {
  // WebSocket 连接认证
  static async authenticateConnection(connectionParams) {
    try {
      const token = connectionParams.authorization?.replace('Bearer ', '') ||
                   connectionParams.Authorization?.replace('Bearer ', '');
      
      if (!token) {
        throw new AuthenticationError('No token provided');
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        throw new AuthenticationError('User not found');
      }
      
      return {
        user,
        isAuthenticated: true
      };
    } catch (error) {
      console.error('WebSocket authentication error:', error.message);
      throw new AuthenticationError('Invalid token');
    }
  }
  
  // 订阅权限检查
  static checkSubscriptionPermission(subscriptionName, user, variables) {
    switch (subscriptionName) {
      case 'notificationCreated':
        // 通知订阅需要登录
        if (!user) {
          throw new AuthenticationError('You must be logged in to subscribe to notifications');
        }
        return true;
      
      case 'userFollowed':
        // 用户关注订阅需要是目标用户本人
        if (!user || user.id !== variables.userId) {
          throw new AuthenticationError('You can only subscribe to your own follow notifications');
        }
        return true;
      
      case 'postCreated':
      case 'postUpdated':
      case 'commentAdded':
      case 'postLikesCount':
      case 'userFollowersCount':
        // 这些订阅是公开的
        return true;
      
      default:
        return true;
    }
  }
}

module.exports = WebSocketAuth;
```

## 安全性和性能

### 1. 查询安全

```javascript
// security/queryValidation.js
const { ValidationError } = require('apollo-server-express');

class QueryValidator {
  // 查询白名单
  static allowedQueries = new Set([
    'IntrospectionQuery', // GraphQL Playground 内省查询
    'GetUser',
    'GetUsers',
    'GetPost',
    'GetPosts',
    'GetMe',
    'CreateUser',
    'UpdateUser',
    'CreatePost',
    'UpdatePost',
    'LikePost',
    'CreateComment'
  ]);
  
  // 验证查询名称
  static validateQueryName(queryName) {
    if (process.env.NODE_ENV === 'production' && !this.allowedQueries.has(queryName)) {
      throw new ValidationError(`Query "${queryName}" is not allowed`);
    }
    return true;
  }
  
  // 验证查询复杂度
  static validateQueryComplexity(query, variables, context) {
    // 检查嵌套深度
    const maxDepth = 10;
    const depth = this.calculateQueryDepth(query);
    
    if (depth > maxDepth) {
      throw new ValidationError(`Query depth ${depth} exceeds maximum depth ${maxDepth}`);
    }
    
    // 检查字段数量
    const maxFields = 100;
    const fieldCount = this.countQueryFields(query);
    
    if (fieldCount > maxFields) {
      throw new ValidationError(`Query field count ${fieldCount} exceeds maximum ${maxFields}`);
    }
    
    return true;
  }
  
  // 计算查询深度
  static calculateQueryDepth(query, depth = 0) {
    if (!query || !query.selectionSet) {
      return depth;
    }
    
    let maxChildDepth = depth;
    
    for (const selection of query.selectionSet.selections) {
      if (selection.kind === 'Field') {
        const childDepth = this.calculateQueryDepth(selection, depth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    }
    
    return maxChildDepth;
  }
  
  // 计算查询字段数量
  static countQueryFields(query) {
    if (!query || !query.selectionSet) {
      return 0;
    }
    
    let count = 0;
    
    for (const selection of query.selectionSet.selections) {
      if (selection.kind === 'Field') {
        count += 1 + this.countQueryFields(selection);
      }
    }
    
    return count;
  }
  
  // 速率限制检查
  static async checkRateLimit(context) {
    const { req } = context;
    const clientId = req.ip || req.connection.remoteAddress;
    const key = `graphql_rate_limit:${clientId}`;
    
    const redis = req.app.locals.redis;
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, 60); // 1分钟窗口
    }
    
    const limit = context.user ? 1000 : 100; // 登录用户更高限制
    
    if (current > limit) {
      throw new ValidationError('Rate limit exceeded');
    }
    
    return true;
  }
}

// 查询成本分析
class QueryCostAnalyzer {
  static fieldCosts = {
    // 基础字段成本
    'User.id': 1,
    'User.username': 1,
    'User.email': 2, // 敏感信息成本更高
    'User.posts': 10, // 关联查询成本高
    'User.followers': 15,
    'User.following': 15,
    
    'Post.id': 1,
    'Post.title': 1,
    'Post.content': 3,
    'Post.author': 5,
    'Post.comments': 20,
    'Post.likes': 10,
    
    'Comment.id': 1,
    'Comment.content': 2,
    'Comment.author': 5,
    'Comment.replies': 15
  };
  
  static calculateQueryCost(query, variables = {}) {
    return this.calculateSelectionSetCost(query.selectionSet, variables);
  }
  
  static calculateSelectionSetCost(selectionSet, variables, parentType = '') {
    if (!selectionSet) return 0;
    
    let totalCost = 0;
    
    for (const selection of selectionSet.selections) {
      if (selection.kind === 'Field') {
        const fieldName = selection.name.value;
        const fieldKey = parentType ? `${parentType}.${fieldName}` : fieldName;
        
        // 基础字段成本
        let fieldCost = this.fieldCosts[fieldKey] || 1;
        
        // 处理参数影响的成本
        if (selection.arguments) {
          for (const arg of selection.arguments) {
            if (arg.name.value === 'first' || arg.name.value === 'last') {
              const limit = this.getArgumentValue(arg, variables);
              fieldCost *= Math.min(limit || 10, 100); // 限制最大倍数
            }
          }
        }
        
        // 递归计算子字段成本
        if (selection.selectionSet) {
          const childCost = this.calculateSelectionSetCost(
            selection.selectionSet,
            variables,
            this.getFieldType(fieldKey)
          );
          fieldCost += childCost;
        }
        
        totalCost += fieldCost;
      }
    }
    
    return totalCost;
  }
  
  static getArgumentValue(argument, variables) {
    if (argument.value.kind === 'IntValue') {
      return parseInt(argument.value.value);
    }
    if (argument.value.kind === 'Variable') {
      return variables[argument.value.name.value];
    }
    return null;
  }
  
  static getFieldType(fieldKey) {
    const typeMap = {
      'Query.users': 'User',
      'Query.posts': 'Post',
      'User.posts': 'Post',
      'Post.comments': 'Comment',
      'Comment.replies': 'Comment'
    };
    return typeMap[fieldKey] || '';
  }
}

module.exports = {
  QueryValidator,
  QueryCostAnalyzer
};
```

### 2. 缓存策略

```javascript
// cache/graphqlCache.js
const Redis = require('ioredis');
const { createHash } = require('crypto');

class GraphQLCache {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 1 // 使用专门的数据库
    });
    
    this.defaultTTL = 300; // 5分钟默认缓存时间
    this.maxCacheSize = 1000000; // 1MB 最大缓存大小
  }
  
  // 生成缓存键
  generateCacheKey(query, variables, context) {
    const userId = context.user?.id || 'anonymous';
    const queryString = typeof query === 'string' ? query : query.loc.source.body;
    const variablesString = JSON.stringify(variables || {});
    
    const content = `${queryString}:${variablesString}:${userId}`;
    return `graphql:${createHash('md5').update(content).digest('hex')}`;
  }
  
  // 获取缓存
  async get(key) {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  // 设置缓存
  async set(key, data, ttl = this.defaultTTL) {
    try {
      const serialized = JSON.stringify(data);
      
      // 检查缓存大小
      if (serialized.length > this.maxCacheSize) {
        console.warn('Cache data too large, skipping cache');
        return false;
      }
      
      await this.redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
  
  // 删除缓存
  async del(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
  
  // 批量删除缓存
  async delPattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }
  
  // 缓存中间件
  createCacheMiddleware(options = {}) {
    const {
      ttl = this.defaultTTL,
      skipCache = () => false,
      cacheKeyGenerator = this.generateCacheKey.bind(this)
    } = options;
    
    return async (resolve, parent, args, context, info) => {
      // 跳过缓存的条件
      if (skipCache(parent, args, context, info)) {
        return resolve(parent, args, context, info);
      }
      
      // 只缓存查询操作
      if (info.operation.operation !== 'query') {
        return resolve(parent, args, context, info);
      }
      
      const cacheKey = cacheKeyGenerator(info.operation, args, context);
      
      // 尝试从缓存获取
      const cached = await this.get(cacheKey);
      if (cached) {
        console.log(`Cache hit: ${cacheKey}`);
        return cached;
      }
      
      // 执行解析器
      const result = await resolve(parent, args, context, info);
      
      // 缓存结果
      if (result) {
        await this.set(cacheKey, result, ttl);
        console.log(`Cache set: ${cacheKey}`);
      }
      
      return result;
    };
  }
  
  // 智能缓存失效
  async invalidateRelatedCache(entityType, entityId) {
    const patterns = {
      user: [
        `graphql:*User*${entityId}*`,
        `graphql:*users*`,
        `graphql:*followers*`,
        `graphql:*following*`
      ],
      post: [
        `graphql:*Post*${entityId}*`,
        `graphql:*posts*`,
        `graphql:*comments*`
      ],
      comment: [
        `graphql:*Comment*${entityId}*`,
        `graphql:*comments*`
      ]
    };
    
    const patternsToDelete = patterns[entityType] || [];
    let totalDeleted = 0;
    
    for (const pattern of patternsToDelete) {
      const deleted = await this.delPattern(pattern);
      totalDeleted += deleted;
    }
    
    console.log(`Invalidated ${totalDeleted} cache entries for ${entityType}:${entityId}`);
    return totalDeleted;
  }
}

// 缓存装饰器
function cached(ttl = 300, keyGenerator) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args) {
      const cache = this.cache || new GraphQLCache();
      
      // 生成缓存键
      const key = keyGenerator 
        ? keyGenerator.apply(this, args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // 尝试从缓存获取
      const cached = await cache.get(key);
      if (cached) {
        return cached;
      }
      
      // 执行原方法
      const result = await method.apply(this, args);
      
      // 缓存结果
      if (result) {
        await cache.set(key, result, ttl);
      }
      
      return result;
    };
    
    return descriptor;
  };
}

module.exports = {
  GraphQLCache,
  cached
};
```

### 3. 错误处理

```javascript
// errors/graphqlErrors.js
const { 
  ApolloError,
  AuthenticationError,
  ForbiddenError,
  UserInputError,
  ValidationError
} = require('apollo-server-express');

// 自定义错误类
class GraphQLCustomError extends ApolloError {
  constructor(message, code, extensions = {}) {
    super(message, code, extensions);
    this.name = 'GraphQLCustomError';
  }
}

class ResourceNotFoundError extends GraphQLCustomError {
  constructor(resource, id) {
    super(
      `${resource} with id ${id} not found`,
      'RESOURCE_NOT_FOUND',
      { resource, id }
    );
  }
}

class DuplicateResourceError extends GraphQLCustomError {
  constructor(resource, field, value) {
    super(
      `${resource} with ${field} '${value}' already exists`,
      'DUPLICATE_RESOURCE',
      { resource, field, value }
    );
  }
}

class RateLimitError extends GraphQLCustomError {
  constructor(limit, window) {
    super(
      `Rate limit exceeded: ${limit} requests per ${window}`,
      'RATE_LIMIT_EXCEEDED',
      { limit, window }
    );
  }
}

class QueryComplexityError extends GraphQLCustomError {
  constructor(complexity, maxComplexity) {
    super(
      `Query complexity ${complexity} exceeds maximum ${maxComplexity}`,
      'QUERY_TOO_COMPLEX',
      { complexity, maxComplexity }
    );
  }
}

// 错误格式化器
class ErrorFormatter {
  static formatError(error) {
    // 记录错误
    console.error('GraphQL Error:', {
      message: error.message,
      code: error.extensions?.code,
      path: error.path,
      locations: error.locations,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // 生产环境下隐藏敏感信息
    if (process.env.NODE_ENV === 'production') {
      // 隐藏内部错误详情
      if (error.message.includes('MongoError') || 
          error.message.includes('ValidationError')) {
        return new Error('Internal server error');
      }
      
      // 移除堆栈跟踪
      delete error.stack;
      delete error.extensions?.exception;
    }
    
    return error;
  }
  
  // 错误分类和统计
  static categorizeError(error) {
    const categories = {
      AUTHENTICATION: ['UNAUTHENTICATED', 'FORBIDDEN'],
      VALIDATION: ['BAD_USER_INPUT', 'GRAPHQL_VALIDATION_FAILED'],
      RATE_LIMIT: ['RATE_LIMIT_EXCEEDED'],
      COMPLEXITY: ['QUERY_TOO_COMPLEX'],
      RESOURCE: ['RESOURCE_NOT_FOUND', 'DUPLICATE_RESOURCE'],
      INTERNAL: ['INTERNAL_ERROR']
    };
    
    const code = error.extensions?.code;
    
    for (const [category, codes] of Object.entries(categories)) {
      if (codes.includes(code)) {
        return category;
      }
    }
    
    return 'UNKNOWN';
  }
}

// 错误监控和报告
class ErrorMonitor {
  constructor() {
    this.errorCounts = new Map();
    this.errorHistory = [];
    this.maxHistorySize = 1000;
  }
  
  recordError(error, context) {
    const category = ErrorFormatter.categorizeError(error);
    const timestamp = new Date();
    
    // 更新错误计数
    const key = `${category}:${error.extensions?.code || 'UNKNOWN'}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    
    // 记录错误历史
    const errorRecord = {
      timestamp,
      category,
      code: error.extensions?.code,
      message: error.message,
      path: error.path,
      userId: context.user?.id,
      ip: context.req?.ip
    };
    
    this.errorHistory.push(errorRecord);
    
    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
    
    // 检查是否需要告警
    this.checkAlerts(category, errorRecord);
  }
  
  checkAlerts(category, errorRecord) {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // 统计最近5分钟的错误
    const recentErrors = this.errorHistory.filter(
      record => record.timestamp.getTime() > fiveMinutesAgo &&
                record.category === category
    );
    
    // 错误率告警阈值
    const thresholds = {
      AUTHENTICATION: 50,
      VALIDATION: 100,
      RATE_LIMIT: 20,
      COMPLEXITY: 10,
      INTERNAL: 5
    };
    
    const threshold = thresholds[category] || 50;
    
    if (recentErrors.length >= threshold) {
      this.sendAlert(category, recentErrors.length, threshold);
    }
  }
  
  async sendAlert(category, count, threshold) {
    const message = `GraphQL Error Alert: ${category} errors exceeded threshold. ` +
                   `Count: ${count}, Threshold: ${threshold}`;
    
    console.error(message);
    
    // 这里可以集成邮件、Slack等告警系统
    // await this.notificationService.sendAlert(message);
  }
  
  getErrorStats() {
    const stats = {
      totalErrors: this.errorHistory.length,
      errorsByCategory: {},
      errorsByCode: {},
      recentErrors: []
    };
    
    // 按类别统计
    for (const record of this.errorHistory) {
      stats.errorsByCategory[record.category] = 
        (stats.errorsByCategory[record.category] || 0) + 1;
      
      if (record.code) {
        stats.errorsByCode[record.code] = 
          (stats.errorsByCode[record.code] || 0) + 1;
      }
    }
    
    // 最近的错误
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    stats.recentErrors = this.errorHistory
      .filter(record => record.timestamp.getTime() > oneHourAgo)
      .slice(-50); // 最近50个错误
    
    return stats;
  }
}

const errorMonitor = new ErrorMonitor();

module.exports = {
  GraphQLCustomError,
  ResourceNotFoundError,
  DuplicateResourceError,
  RateLimitError,
  QueryComplexityError,
  ErrorFormatter,
  ErrorMonitor,
  errorMonitor
};
```

## 测试

### 1. 单元测试

```javascript
// tests/resolvers/userResolvers.test.js
const { createTestClient } = require('apollo-server-testing');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const typeDefs = require('../../schema');
const resolvers = require('../../resolvers');
const { User, Post } = require('../../models');

describe('User Resolvers', () => {
  let server;
  let query;
  let mutate;
  let mongoServer;
  
  beforeAll(async () => {
    // 启动内存数据库
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // 创建测试服务器
    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({
        user: null,
        dataSources: {
          userAPI: {
            getUserById: jest.fn()
          }
        }
      })
    });
    
    const testClient = createTestClient(server);
    query = testClient.query;
    mutate = testClient.mutate;
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // 清理数据库
    await User.deleteMany({});
    await Post.deleteMany({});
  });
  
  describe('Query.user', () => {
    it('should return user by id', async () => {
      // 创建测试用户
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword'
      });
      await user.save();
      
      const GET_USER = gql`
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            username
            email
          }
        }
      `;
      
      const { data, errors } = await query({
        query: GET_USER,
        variables: { id: user._id.toString() }
      });
      
      expect(errors).toBeUndefined();
      expect(data.user).toEqual({
        id: user._id.toString(),
        username: 'testuser',
        email: 'test@example.com'
      });
    });
    
    it('should return null for non-existent user', async () => {
      const GET_USER = gql`
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            username
          }
        }
      `;
      
      const { data, errors } = await query({
        query: GET_USER,
        variables: { id: new mongoose.Types.ObjectId().toString() }
      });
      
      expect(errors).toBeUndefined();
      expect(data.user).toBeNull();
    });
  });
  
  describe('Query.users', () => {
    it('should return paginated users', async () => {
      // 创建测试用户
      const users = await User.create([
        { username: 'user1', email: 'user1@example.com', password: 'hash1' },
        { username: 'user2', email: 'user2@example.com', password: 'hash2' },
        { username: 'user3', email: 'user3@example.com', password: 'hash3' }
      ]);
      
      const GET_USERS = gql`
        query GetUsers($pagination: PaginationInput) {
          users(pagination: $pagination) {
            edges {
              node {
                id
                username
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
            totalCount
          }
        }
      `;
      
      const { data, errors } = await query({
        query: GET_USERS,
        variables: {
          pagination: { first: 2 }
        }
      });
      
      expect(errors).toBeUndefined();
      expect(data.users.edges).toHaveLength(2);
      expect(data.users.totalCount).toBe(3);
      expect(data.users.pageInfo.hasNextPage).toBe(true);
    });
  });
  
  describe('Mutation.createUser', () => {
    it('should create a new user', async () => {
      const CREATE_USER = gql`
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            username
            email
          }
        }
      `;
      
      const { data, errors } = await mutate({
        mutation: CREATE_USER,
        variables: {
          input: {
            username: 'newuser',
            email: 'newuser@example.com',
            password: 'password123'
          }
        }
      });
      
      expect(errors).toBeUndefined();
      expect(data.createUser).toMatchObject({
        username: 'newuser',
        email: 'newuser@example.com'
      });
      
      // 验证用户已保存到数据库
      const savedUser = await User.findOne({ username: 'newuser' });
      expect(savedUser).toBeTruthy();
    });
    
    it('should throw error for duplicate username', async () => {
      // 先创建一个用户
      await User.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'hashedpassword'
      });
      
      const CREATE_USER = gql`
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            username
          }
        }
      `;
      
      const { data, errors } = await mutate({
        mutation: CREATE_USER,
        variables: {
          input: {
            username: 'existinguser',
            email: 'different@example.com',
            password: 'password123'
          }
        }
      });
      
      expect(data.createUser).toBeNull();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('already exists');
    });
  });
});
```

### 2. 集成测试

```javascript
// tests/integration/graphql.integration.test.js
const request = require('supertest');
const { app } = require('../../server');
const { User, Post, Comment } = require('../../models');
const jwt = require('jsonwebtoken');

describe('GraphQL Integration Tests', () => {
  let authToken;
  let testUser;
  
  beforeEach(async () => {
    // 清理数据库
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    
    // 创建测试用户
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword'
    });
    
    // 生成认证令牌
    authToken = jwt.sign(
      { id: testUser._id, username: testUser.username },
      process.env.JWT_SECRET
    );
  });
  
  describe('Authentication', () => {
    it('should require authentication for protected queries', async () => {
      const query = `
        query {
          me {
            id
            username
          }
        }
      `;
      
      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('logged in');
    });
    
    it('should return user data for authenticated requests', async () => {
      const query = `
        query {
          me {
            id
            username
            email
          }
        }
      `;
      
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);
      
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.me).toMatchObject({
        id: testUser._id.toString(),
        username: 'testuser',
        email: 'test@example.com'
      });
    });
  });
  
  describe('Complex Queries', () => {
    it('should handle nested queries with DataLoader', async () => {
      // 创建测试数据
      const post = await Post.create({
        title: 'Test Post',
        content: 'Test content',
        author: testUser._id,
        published: true
      });
      
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        post: post._id
      });
      
      const query = `
        query {
          posts(pagination: { first: 10 }) {
            edges {
              node {
                id
                title
                author {
                  id
                  username
                }
                comments {
                  id
                  content
                  author {
                    id
                    username
                  }
                }
              }
            }
          }
        }
      `;
      
      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);
      
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.posts.edges).toHaveLength(1);
      
      const postData = response.body.data.posts.edges[0].node;
      expect(postData.title).toBe('Test Post');
      expect(postData.author.username).toBe('testuser');
      expect(postData.comments).toHaveLength(1);
      expect(postData.comments[0].content).toBe('Test comment');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const query = `
        query {
          posts {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      `;
      
      // 发送大量请求
      const requests = Array(150).fill().map(() => 
        request(app)
          .post('/graphql')
          .send({ query })
      );
      
      const responses = await Promise.all(requests);
      
      // 检查是否有请求被限制
      const rateLimitedResponses = responses.filter(
        response => response.body.errors && 
                   response.body.errors.some(error => 
                     error.message.includes('Rate limit')
                   )
      );
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
```

## 最佳实践

### 1. Schema 设计原则

- **类型优先设计**：先设计 Schema，再实现 Resolver
- **一致性命名**：使用一致的命名约定
- **适当的抽象**：使用接口和联合类型
- **版本控制**：通过字段废弃而非破坏性变更

### 2. 性能优化

- **使用 DataLoader**：解决 N+1 查询问题
- **查询复杂度限制**：防止恶意查询
- **缓存策略**：合理使用查询缓存
- **分页实现**：使用游标分页

### 3. 安全考虑

- **认证和授权**：保护敏感数据
- **输入验证**：验证所有输入数据
- **查询深度限制**：防止深度嵌套攻击
- **速率限制**：防止滥用

### 4. 监控和调试

- **查询分析**：监控查询性能
- **错误跟踪**：记录和分析错误
- **指标收集**：收集关键性能指标
- **日志记录**：详细的操作日志

## 总结

GraphQL 为 Node.js 应用提供了强大而灵活的 API 解决方案。通过合理的 Schema 设计、高效的 Resolver 实现、完善的缓存策略和安全措施，可以构建出高性能、可扩展的 GraphQL API。

关键要点：
- 使用 DataLoader 优化数据加载
- 实现查询复杂度控制
- 建立完善的错误处理机制
- 采用适当的缓存策略
- 确保 API 安全性

