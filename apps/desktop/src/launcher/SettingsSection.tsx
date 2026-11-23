import type {ReactNode} from 'react';

export function SettingsSection({title,detail,cardTitle,children}:{
  title:string; detail?:ReactNode; cardTitle?:string; children:ReactNode;
}){
  return <section className="preference-section settings-block" data-card-title={cardTitle}>
    <header className="settings-section-head"><h2>{title}</h2>{detail&&<span>{detail}</span>}</header>
    {children}
  </section>;
}
