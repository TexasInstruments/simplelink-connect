import { createIconSetFromFontello } from 'react-native-vector-icons';
import fontelloConfig from '../../../assets/fonts/brands_font_config.json';
import { BrandIconName } from '../../../types';

const Icon = createIconSetFromFontello(fontelloConfig);

interface Props {
  name: BrandIconName;
}

const BrandIcon: React.FC<Props> = ({ name }) => {
  return <Icon name={name} size={16} />;
};

export default BrandIcon;
