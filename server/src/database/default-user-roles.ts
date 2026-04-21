export type UserRoleCode = 'super_admin' | 'admin' | 'author' | 'user';

export interface DefaultUserRoleDefinition {
  code: UserRoleCode;
  name: string;
  description: string;
  sortOrder: number;
  isSystem: boolean;
}

export const DEFAULT_USER_ROLES: DefaultUserRoleDefinition[] = [
  {
    code: 'super_admin',
    name: '超级管理员',
    description: '拥有系统最高权限，可管理数据库、配置和所有后台资源。',
    sortOrder: 1,
    isSystem: true,
  },
  {
    code: 'admin',
    name: '管理员',
    description: '拥有大部分后台管理权限，但不能执行超级管理员专属操作。',
    sortOrder: 2,
    isSystem: true,
  },
  {
    code: 'author',
    name: '作者',
    description: '可管理自己的内容与创作资源。',
    sortOrder: 3,
    isSystem: true,
  },
  {
    code: 'user',
    name: '普通用户',
    description: '默认注册角色，拥有前台访问与个人中心能力。',
    sortOrder: 4,
    isSystem: true,
  },
];
